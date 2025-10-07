// === ESP32: 폴링+배치 최종본 (빈 배치=정상 처리) ===
// - 서버가 {"items":[...]} 이면 배치 큐잉, []이면 1초 후 재시도(에러 아님)
// - 단건 {"motor_id":N}도 호환 (fallback)
// - Consumer: NoData 타임아웃 + 5→500ms 지수 백오프 + 30s 로깅 스로틀
// - 큐 Full 시 완전 블로킹 (portMAX_DELAY)
// - /health 상태 확인

#include <WiFi.h>
#include <WebServer.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <stdarg.h>
#include "freertos/FreeRTOS.h"
#include "freertos/event_groups.h"
#include "freertos/queue.h"

// ===== 문자열화 매크로(먼저 정의!) =====
#define STR_HELPER(x) #x
#define STRINGIFY(x) STR_HELPER(x)

// ===== 사용자 설정 =====
const char* WIFI_SSID  = "Qasdg";
const char* WIFI_PASS  = "24681012";

// 서버 URL (배치 크기 max 파라미터)
#define MAX_BATCH 16
const char* SERVER_URL =
  "http://220.149.231.121:3000/go/get_data?max=" STRINGIFY(MAX_BATCH);

// ===== 로컬 상태 서버 =====
WebServer server(80);

// ===== FreeRTOS 리소스 =====
#define WIFI_CONNECTED_BIT (1 << 0)
#define QUEUE_LEN 64

static StaticEventGroup_t s_events_buf;
static EventGroupHandle_t g_events = nullptr;

static StaticQueue_t  s_mq_struct;
static uint8_t        s_mq_storage[QUEUE_LEN * sizeof(int)];
static QueueHandle_t  g_motor_queue = nullptr;

// ===== 로그 유틸 =====
static inline void logf(const char* fmt, ...) {
  char buf[256];
  va_list ap; va_start(ap, fmt);
  vsnprintf(buf, sizeof(buf), fmt, ap);
  va_end(ap);
  Serial.println(buf);
}

// ===== 헬스 핸들러 =====
void handle_root() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "text/plain; charset=utf-8", "ESP32 queue mode. Try /health");
}
void handle_health() {
  bool ok = (WiFi.status() == WL_CONNECTED);
  String ip = WiFi.localIP().toString();
  UBaseType_t qWaiting = g_motor_queue ? uxQueueMessagesWaiting(g_motor_queue) : 0;

  StaticJsonDocument<192> doc;
  doc["ok"]    = ok;
  doc["ip"]    = ip;
  doc["queue"] = qWaiting;

  String body; serializeJson(doc, body);
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Cache-Control", "no-store");
  server.send(200, "application/json; charset=utf-8", body);
}
void handle_404(){ server.send(404, "application/json", "{\"error\":\"not found\"}"); }

// ===== Wi-Fi Task =====
void WiFiTask(void*){
  for(;;){
    if (WiFi.status() != WL_CONNECTED) {
      logf("[WiFi] Connecting to %s ...", WIFI_SSID);
      WiFi.begin(WIFI_SSID, WIFI_PASS);
      uint32_t start = millis();
      while (WiFi.status() != WL_CONNECTED && millis() - start < 15000) {
        Serial.print('.');
        vTaskDelay(pdMS_TO_TICKS(500));
      }
      Serial.println();

      if (WiFi.status() == WL_CONNECTED) {
        logf("[WiFi] Connected. IP: %s", WiFi.localIP().toString().c_str());
        if (g_events) xEventGroupSetBits(g_events, WIFI_CONNECTED_BIT);
      } else {
        logf("[WiFi] Connect failed. Retry in 5s");
        if (g_events) xEventGroupClearBits(g_events, WIFI_CONNECTED_BIT);
        vTaskDelay(pdMS_TO_TICKS(5000));
      }
    } else {
      vTaskDelay(pdMS_TO_TICKS(2000));
      if (WiFi.status() != WL_CONNECTED && g_events) {
        xEventGroupClearBits(g_events, WIFI_CONNECTED_BIT);
      }
    }
  }
}

// ===== JSON 유틸 =====
static bool parseSingleMotorId(const String& body, int& outId){
  StaticJsonDocument<256> doc;
  auto err = deserializeJson(doc, body);
  if (err) return false;
  if (!doc.containsKey("motor_id")) return false;

  if (doc["motor_id"].is<int>()) {
    outId = doc["motor_id"].as<int>();
    return true;
  }
  if (doc["motor_id"].is<const char*>()) {
    const char* s = doc["motor_id"].as<const char*>();
    if (s && *s) { outId = atoi(s); return true; }
  }
  return false;
}
static int parseBatchMotorIds(const String& body, int* outBuf, int maxOut, bool& isEmptyBatch){
  StaticJsonDocument<1024> doc;
  auto err = deserializeJson(doc, body);
  if (err) { isEmptyBatch = false; return 0; }

  if (!doc.containsKey("items") || !doc["items"].is<JsonArray>()) { isEmptyBatch = false; return 0; }

  JsonArray arr = doc["items"].as<JsonArray>();
  if (arr.size() == 0) { isEmptyBatch = true; return 0; }

  int count = 0;
  for (JsonObject it : arr) {
    if (count >= maxOut) break;
    if (it["id"].is<int>()) {
      outBuf[count++] = it["id"].as<int>();
    } else if (it["id"].is<const char*>()) {
      const char* s = it["id"].as<const char*>();
      if (s && *s) outBuf[count++] = atoi(s);
    }
  }
  isEmptyBatch = false;
  return count;
}

// ===== Fetch Task =====
void FetchTask(void*){
  const uint32_t MIN_BACKOFF = 1000, MAX_BACKOFF = 10000;
  uint32_t backoff = MIN_BACKOFF;

  if (g_events) {
    xEventGroupWaitBits(g_events, WIFI_CONNECTED_BIT, pdFALSE, pdTRUE, portMAX_DELAY);
  }

  for(;;){
    if (!g_events || !(xEventGroupGetBits(g_events) & WIFI_CONNECTED_BIT)) {
      vTaskDelay(pdMS_TO_TICKS(1000));
      continue;
    }

    HTTPClient http;
    http.setTimeout(5000);
    http.begin(SERVER_URL);

    const char* hdrs[] = {"Content-Type"};
    http.collectHeaders(hdrs, 1);

    int code = http.GET();
    String ct  = http.header("Content-Type");
    logf("[HTTP] code=%d, ct=%s", code, ct.c_str());

    if (code == 200 && ct.indexOf("application/json") >= 0) {
      String body = http.getString();

      // 1) 배치 우선
      int ids[MAX_BATCH];
      bool emptyBatch = false;
      int n = parseBatchMotorIds(body, ids, MAX_BATCH, emptyBatch);

      if (n > 0) {
        for (int i = 0; i < n; ++i) {
          xQueueSend(g_motor_queue, &ids[i], portMAX_DELAY);  // Full 시 블로킹
          logf("[QUEUE] push motor_id=%d", ids[i]);
        }
        backoff = MIN_BACKOFF;   // 성공 → 1s 유지
      } else if (emptyBatch) {
        // 빈 배치 = 정상 (지침서 3.1) → 짧은 주기로 재시도
        logf("[EMPTY] no items in batch");
        backoff = MIN_BACKOFF;   // 1s
      } else {
        // 2) 단건 fallback
        int motorId = 0;
        if (parseSingleMotorId(body, motorId)) {
          xQueueSend(g_motor_queue, &motorId, portMAX_DELAY);
          logf("[QUEUE] push motor_id=%d", motorId);
          backoff = MIN_BACKOFF;
        } else {
          logf("[JSON] parse/key error");
          backoff = (backoff < MAX_BACKOFF) ? backoff * 2 : MAX_BACKOFF;
        }
      }
    } else {
      logf("[NET] http error or bad content-type");
      backoff = (backoff < MAX_BACKOFF) ? backoff * 2 : MAX_BACKOFF;
    }

    http.end();
    logf("[BACKOFF] %u ms", backoff);
    vTaskDelay(pdMS_TO_TICKS(backoff));
  }
}

// ===== Consumer Task (NoData 타임아웃 + 지수 백오프 + 로깅 스로틀) =====
void ConsumerTask(void*){
  int id = 0;
  uint32_t backoff = 5;                 // 5ms 시작
  const uint32_t MAX_BACKOFF = 500;     // ≤ 500ms
  uint32_t noDataCount = 0;
  uint32_t lastLogMs = 0;

  for(;;){
    if (!g_motor_queue) { vTaskDelay(pdMS_TO_TICKS(50)); continue; }

    if (xQueueReceive(g_motor_queue, &id, pdMS_TO_TICKS(50)) == pdPASS) {
      logf("[QUEUE] pop motor_id=%d  --> (TODO: control motor)", id);
      backoff = 5; // 리셋
      continue;
    }

    noDataCount++;
    vTaskDelay(pdMS_TO_TICKS(backoff));
    if (backoff < MAX_BACKOFF) backoff = backoff * 2; // 5→10→20→...→<=500

    uint32_t now = millis();
    if (now - lastLogMs > 30000) { // 30s 스로틀
      logf("[NoData] count=%u, backoff=%u ms", noDataCount, backoff);
      lastLogMs = now;
    }
  }
}

// ===== setup/loop =====
void setup(){
  Serial.begin(115200);
  delay(200);

  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false);

  g_events = xEventGroupCreateStatic(&s_events_buf);
  g_motor_queue = xQueueCreateStatic(QUEUE_LEN, sizeof(int), s_mq_storage, &s_mq_struct);
  logf("[SYS] events=%p  queue=%p", g_events, g_motor_queue);
  if (!g_events || !g_motor_queue) {
    Serial.println("[FATAL] RTOS create fail");
    for(;;) delay(1000);
  }

  server.on("/",        HTTP_GET, handle_root);
  server.on("/health",  HTTP_GET, handle_health);
  server.onNotFound(handle_404);
  server.begin();
  Serial.println("[HTTP] Local status server started on :80");

  xTaskCreatePinnedToCore(WiFiTask,     "WiFiTask",     4096,  nullptr, 2, nullptr, 0);
  xTaskCreatePinnedToCore(FetchTask,    "FetchTask",    8192,  nullptr, 1, nullptr, 1);
  xTaskCreatePinnedToCore(ConsumerTask, "ConsumerTask", 4096,  nullptr, 1, nullptr, 1);
}
void loop(){ server.handleClient(); }

