#include "moji-send-frame.h"

jsi::Value MoJISendFrame(jsi::Runtime& runtime, const jsi::Value& thisValue, 
            const jsi::Value* arguments, size_t count) {
                jsi::Object arrayBufferObj = arguments[0].asObject(runtime);
                jsi::ArrayBuffer arrayBuffer = arrayBufferObj.getArrayBuffer(runtime);

                uint8_t * bufferData = arrayBuffer.data(runtime);
                size_t bufferSize = arrayBuffer.size(runtime);

                std::string ip = arguments[1].asString(runtime).utf8(runtime);
                
                // **************** //

                jsi::Object result = jsi::Object(runtime);
                result.setProperty(runtime, "ok", true);
                return result;
}