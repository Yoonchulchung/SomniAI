// === ESP32: 클라이언트 전용 HTTP GET 테스트 (요청만 확인) ===
// - Wi-Fi 접속 → 1초마다 고정IP:3000 으로 GET
// - 시리얼에 응답 코드/헤더 출력 (본문 파싱 없음)

#include <WiFi.h>
#include <WebServer.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <stdarg.h>               // for va_list
#include "freertos/FreeRTOS.h"
#include "freertos/event_groups.h"
#include "freertos/queue.h"

// ===== 사용자 설정 =====
const char* WIFI_SSID  = "Qasdg";
const char* WIFI_PASS  = "24681012";
const char* SERVER_URL = "http://220.149.231.121:3000/go/get_data";

// ===== 로컬 상태 서버 =====
WebServer server(80);

// ===== FreeRTOS 리소스(정적) =====
#define WIFI_CONNECTED_BIT (1 << 0)
#define QUEUE_LEN 64

// EventGroup 정적 생성
static StaticEventGroup_t s_events_buf;
static EventGroupHandle_t g_events = nullptr;

// Queue 정적 생성 (int 저장)
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

// ===== 핸들러 =====
void handle_root() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "text/plain; charset=utf-8", "ESP32 queue mode. Try /health");
}

void handle_health() {
  bool ok = (WiFi.status() == WL_CONNECTED);
  String ip = WiFi.localIP().toString();

  // 큐 길이는 NULL 방어 후 조회
  UBaseType_t qWaiting = 0;
  if (g_motor_queue) qWaiting = uxQueueMessagesWaiting(g_motor_queue);

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

// ===== 태스크 =====
void WiFiTask(void*){
  // (중요) Wi-Fi 초기화는 setup()에서 선행 완료. 여기서는 접속/재접속만 담당.
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

bool extractMotorId(const String& body, int& outId){
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

void FetchTask(void*){
  const uint32_t MIN_BACKOFF = 1000, MAX_BACKOFF = 10000;
  uint32_t backoff = MIN_BACKOFF;

  // Wi-Fi 붙을 때까지 대기 (NULL 방어)
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
      int motorId = 0;
      if (extractMotorId(body, motorId)) {
        if (g_motor_queue &&
            xQueueSend(g_motor_queue, &motorId, pdMS_TO_TICKS(1000)) == pdPASS) {
          logf("[QUEUE] push motor_id=%d", motorId);
          backoff = MIN_BACKOFF;
        } else {
          logf("[QUEUE] push failed (queue=%p)", g_motor_queue);
          backoff = (backoff < MAX_BACKOFF) ? backoff * 2 : MAX_BACKOFF;
        }
      } else {
        logf("[JSON] parse/key error");
        backoff = (backoff < MAX_BACKOFF) ? backoff * 2 : MAX_BACKOFF;
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

void ConsumerTask(void*){
  int id = 0;
  for(;;){
    if (!g_motor_queue) { vTaskDelay(pdMS_TO_TICKS(100)); continue; }
    if (xQueueReceive(g_motor_queue, &id, portMAX_DELAY) == pdPASS) {
      logf("[QUEUE] pop motor_id=%d  --> (TODO: control motor)", id);
    }
  }
}

// ===== setup/loop =====
void setup(){
  Serial.begin(115200);
  delay(200);

  // (핵심) WebServer가 돌기 전에 Wi-Fi/뮤텍스 먼저 초기화
  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false);

  // 1) RTOS 리소스 생성 (정적)
  g_events = xEventGroupCreateStatic(&s_events_buf);
  g_motor_queue = xQueueCreateStatic(QUEUE_LEN, sizeof(int), s_mq_storage, &s_mq_struct);
  logf("[SYS] events=%p  queue=%p", g_events, g_motor_queue);
  if (!g_events || !g_motor_queue) {
    Serial.println("[FATAL] RTOS create fail");
    for(;;) delay(1000);
  }

  // 2) 로컬 상태 서버
  server.on("/",        HTTP_GET, handle_root);
  server.on("/health",  HTTP_GET, handle_health);
  server.onNotFound(handle_404);
  server.begin();
  Serial.println("[HTTP] Local status server started on :80");

  // 3) 태스크 시작
  xTaskCreatePinnedToCore(WiFiTask,     "WiFiTask",     4096,  nullptr, 2, nullptr, 0);
  xTaskCreatePinnedToCore(FetchTask,    "FetchTask",    8192,  nullptr, 1, nullptr, 1);
  xTaskCreatePinnedToCore(ConsumerTask, "ConsumerTask", 4096,  nullptr, 1, nullptr, 1);
}

void loop(){
  server.handleClient();
}