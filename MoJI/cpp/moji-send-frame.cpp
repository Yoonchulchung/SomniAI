#include "moji-send-frame.h"
#include <atomic>
#include <android/log.h>
#include <sstream>
#include <iomanip>

#define LOGD(...) __android_log_print(ANDROID_LOG_DEBUG, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)

namespace MoJIStats {
    std::atomic<int> totalSent{0};
    std::atomic<int> successCount{0};
    std::atomic<int> failureCount{0};
    std::atomic<int> lastResponseTimeMs{0};
}

std::string bytesToHex(const uint8_t* data, size_t length, size_t maxBytes = 32) {
    std::stringstream ss;
    size_t displayLength = std::min(length, maxBytes);
    for (size_t i = 0; i < displayLength; i++) {
        ss << std::hex << std::setw(2) << std::setfill('0') << (int)data[i] << " ";
    }
    if (length > maxBytes) {
        ss << "...";
    }
    return ss.str();
}

jsi::Value MoJISend::MoJISendFrame(jsi::Runtime& runtime, const jsi::Value& thisValue,
            const jsi::Value* arguments, size_t count) {
    
    if (count < 2) {
        LOGE("[error] Not enough arguments. Expected 2, got %zu", count);
        return jsi::Value::undefined();
    }

    try {
        if (!arguments[0].isObject()) {
            LOGE("[error] First argument is not an Object (Buffer)");
            return jsi::Value::undefined();
        }
        
        jsi::Object arrayBufferObj = arguments[0].asObject(runtime);
        if (!arrayBufferObj.isArrayBuffer(runtime)) {
            LOGE("[error] First argument is not an ArrayBuffer");
            return jsi::Value::undefined();
        }

        jsi::ArrayBuffer arrayBuffer = arrayBufferObj.getArrayBuffer(runtime);
        uint8_t* bufferData = arrayBuffer.data(runtime);
        size_t bufferSize = arrayBuffer.size(runtime);

        if (!arguments[1].isString()) {
             LOGE("[error] Second argument is not a String (URL)");
             return jsi::Value::undefined();
        }

        std::string ip = arguments[1].asString(runtime).utf8(runtime);

        std::vector<uint8_t> copiedBuffer;
        copiedBuffer.assign(bufferData, bufferData + bufferSize);
    
        std::string copiedIp = ip;
        MoJIStats::totalSent++;

        std::thread([copiedBuffer = std::move(copiedBuffer), copiedIp]() {
            auto start = std::chrono::high_resolution_clock::now();

            bool success = SendHTTP::sendBufferOverHTTP(
                copiedBuffer.data(), 
                copiedBuffer.size(),
                copiedIp, 
                2
            );

            auto end = std::chrono::high_resolution_clock::now();
            auto duration = std::chrono::duration_cast<std::chrono::milliseconds>(end - start);
            MoJIStats::lastResponseTimeMs = duration.count();

            if (success) {
                MoJIStats::successCount++;
            } else {
                MoJIStats::failureCount++;
                LOGE("[error] end Failed! (%ld ms)", (long)duration.count());
            }
        }).detach();

        jsi::Object result = jsi::Object(runtime);
        result.setProperty(runtime, "queued", true);
        result.setProperty(runtime, "totalSent", MoJIStats::totalSent.load());
        return result;

    } catch (const jsi::JSError& e) {
        LOGE("[error] JSI Error Exception: %s", e.getMessage().c_str());
        return jsi::Value::undefined();
    } catch (const std::exception& e) {
        LOGE("[error] Standard Exception: %s", e.what());
        return jsi::Value::undefined();
    } catch (...) {
        LOGE("[error] Unknown Exception occurred in MoJISendFrame");
        return jsi::Value::undefined();
    }
}

jsi::Value MoJISend::MoJIGetStats(jsi::Runtime& runtime, const jsi::Value& thisValue,
            const jsi::Value* arguments, size_t count) {
    jsi::Object stats = jsi::Object(runtime);
    stats.setProperty(runtime, "totalSent", MoJIStats::totalSent.load());
    stats.setProperty(runtime, "successCount", MoJIStats::successCount.load());
    stats.setProperty(runtime, "failureCount", MoJIStats::failureCount.load());
    stats.setProperty(runtime, "lastResponseTimeMs", MoJIStats::lastResponseTimeMs.load());

    int total = MoJIStats::totalSent.load();
    int success = MoJIStats::successCount.load();
    double successRate = total > 0 ? (success * 100.0 / total) : 0.0;
    stats.setProperty(runtime, "successRate", successRate);

    return stats;
}

jsi::Value MoJISend::MoJIResetStats(jsi::Runtime& runtime, const jsi::Value& thisValue,
            const jsi::Value* arguments, size_t count) {
    LOGD("Stats Reset");
    MoJIStats::totalSent = 0;
    MoJIStats::successCount = 0;
    MoJIStats::failureCount = 0;
    MoJIStats::lastResponseTimeMs = 0;

    jsi::Object result = jsi::Object(runtime);
    result.setProperty(runtime, "reset", true);
    return result;
}