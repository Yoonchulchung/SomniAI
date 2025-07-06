#include <jni.h>
#include <jsi/jsi.h>
using namespace facebook;

void install (jsi::Runtime& rt){
    
    auto sendFrame = jsi::Function::createFromHostFunction(
        rt, jsi::PropNameID::forAScii(rt, "sendFrame"), 1,
        [](jsi::Runtime& rt,
            const jsi::Value&, 
            const jsi::Value* args,
            size_t count) -> jsi::Value {

                auto arrayBuffer = args[0].asObject(rt).getArrayBuffer(rt);
                Uint8_t *dataPtr = arrayBuffer.data(rt);
                size_t length = arrayBuffer.size(rt);

                nativeSendFrame(dataPtr, length);
                
                return jsi::value:undefined();
            });

    rt.global().setProperty(rt, "sendFrame", std:move(sendFrame));
}

extern "c"
JNIEXPORT void JNICALL
Java_com_mrousavy_Camera_FrameProcessorPlugins_install(
    JNIEnv* env,
    jobject thiz,
    jlong jsiPtr
) {
    auto *rt = reinterpret_cast<jsi::Runtime *>(jsiPtr);
    install(*rt);
}