#include "moji-send-frame.h"
#include <atomic>

// Global statistics for tracking transmission status
namespace MoJIStats {
    std::atomic<int> totalSent{0};
    std::atomic<int> successCount{0};
    std::atomic<int> failureCount{0};
    std::atomic<int> lastResponseTimeMs{0};
}

jsi::Value MoJISend::MoJISendFrame(jsi::Runtime& runtime, const jsi::Value& thisValue,
            const jsi::Value* arguments, size_t count) {
                jsi::Object arrayBufferObj = arguments[0].asObject(runtime);
                jsi::ArrayBuffer arrayBuffer = arrayBufferObj.getArrayBuffer(runtime);

                uint8_t * bufferData = arrayBuffer.data(runtime);
                size_t bufferSize = arrayBuffer.size(runtime);

                std::string ip = arguments[1].asString(runtime).utf8(runtime);

                /* ================================ */

                std::vector<uint8_t> copiedBuffer(bufferData, bufferData + bufferSize);
                std::string copiedIp = ip;

                MoJIStats::totalSent++;

                std::thread([copiedBuffer = std::move(copiedBuffer), copiedIp]() {
                    auto start = std::chrono::high_resolution_clock::now();

                    bool success = SendHTTP::sendBufferOverHTTP(copiedBuffer.data(), copiedBuffer.size(), copiedIp, 2);

                    auto end = std::chrono::high_resolution_clock::now();
                    auto duration = std::chrono::duration_cast<std::chrono::milliseconds>(end - start);
                    MoJIStats::lastResponseTimeMs = duration.count();

                    if (success) {
                        MoJIStats::successCount++;
                    } else {
                        MoJIStats::failureCount++;
                    }
                }).detach();

                /* ================================ */
                jsi::Object result = jsi::Object(runtime);
                result.setProperty(runtime, "queued", true);
                result.setProperty(runtime, "totalSent", MoJIStats::totalSent.load());
                return result;
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
                MoJIStats::totalSent = 0;
                MoJIStats::successCount = 0;
                MoJIStats::failureCount = 0;
                MoJIStats::lastResponseTimeMs = 0;

                jsi::Object result = jsi::Object(runtime);
                result.setProperty(runtime, "reset", true);
                return result;
}
