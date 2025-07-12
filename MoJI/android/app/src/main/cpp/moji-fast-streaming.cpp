#include <iostream>

#include "moji-fast-streaming.h"


void MoJIPlugin::installMoJI(jsi::Runtime& runtime, std::shared_ptr<react::CallInvoker> callInvoker) {

    auto func = [=](jsi::Runtime& runtime,
                    const jsi::Value& thisArg,
                    const jsi::Value* args,
                size_t count) -> jsi::Value {
                    auto plugin = std::make_shared<MoJIPlugin> (callInvoker);
                    auto result = jsi::Object::createFromHostObject(runtime, plugin);

                    return result;
                };

    auto jsiFunc = jsi::Function::createFromHostFunction(runtime,
        jsi::PropNameID::forUtf8(runtime, "__FastStream"),
    1,
    func);

    runtime.global().setProperty(runtime, "__FastStream", jsiFunc);

}

jsi::Value MoJIPlugin::get(jsi::Runtime& runtime, const jsi::PropNameID& propNameID) {
    auto propName = propNameID.utf8(runtime);

    if (propName == "sendFrame") {
        /*  usage:
            MoJIPlugin.sendFrame(frame_in_bufferarray, ip_addr_in_string)"
        */
        return jsi::Function::createFromHostFunction(
            runtime, jsi::PropNameID::forAscii(runtime, "sendFrame"), 2, MoJISend::MoJISendFrame);
    }
}