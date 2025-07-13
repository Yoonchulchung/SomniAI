#include <jni.h>
#include <jsi/jsi.h>

#include "moji-fast-streaming.h"

#include <fbjni/fbjni.h>                      
#include <ReactCommon/CallInvokerHolder.h>

using namespace facebook;
using namespace facebook::jni;  
using namespace facebook::react;

extern "C"
JNIEXPORT void JNICALL

Java_com_moji_faststreaming_MoJIFastStreamingModule_nativeInstall(JNIEnv *env, jobject thiz, jlong jsi_runtime_ref,
                jobject js_call_invoker_holder) {

                    auto jsRuntime{ reinterpret_cast<jsi::Runtime*>(jsi_runtime_ref) };
                    auto jsCallInvoker{ jni::alias_ref<react::CallInvokerHolder::javaobject>{reinterpret_cast<react::CallInvokerHolder::javaobject>(js_call_invoker_holder) }->cthis()->getCallInvoker() };

                    MoJIPlugin::installMoJI(*jsRuntime, jsCallInvoker);
                }