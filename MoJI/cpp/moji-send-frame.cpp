#include "moji-send-frame.h"

jsi::Value MoJISend::MoJISendFrame(jsi::Runtime& runtime, const jsi::Value& thisValue, 
            const jsi::Value* arguments, size_t count) {
                jsi::Object arrayBufferObj = arguments[0].asObject(runtime);
                jsi::ArrayBuffer arrayBuffer = arrayBufferObj.getArrayBuffer(runtime);

                uint8_t * bufferData = arrayBuffer.data(runtime);
                size_t bufferSize = arrayBuffer.size(runtime);

                std::string ip = arguments[1].asString(runtime).utf8(runtime);

                /* ================================ */

                //MoJISend::sendBufferOverHTTP(bufferData, bufferSize, ip, port);

                std::vector<uint8_t> copiedBuffer(bufferData, bufferData + bufferSize);
                std::string copiedIp = ip;

                std::thread([copiedBuffer = std::move(copiedBuffer), copiedIp]() {
                    MoJISend::sendBufferOverHTTP(copiedBuffer.data(), copiedBuffer.size(), copiedIp);
                }).detach();
                
                /* ================================ */
                jsi::Object result = jsi::Object(runtime);
                result.setProperty(runtime, "ok", true);
                return result;
}
