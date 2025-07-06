// JSI 네이티브 모듈 만들기

#include <jsi/jsi.h>
#include <jni.h>
#include <memory>
#include "FastStreamer.hpp"   // 전송 로직 (별도 구현)

using namespace facebook;

static std::shared_ptr<FastStreamer> gStreamer;

// ①  HostObject
class FastStreamingHost : public jsi::HostObject {
 public:
  jsi::Value get(jsi::Runtime& rt,
                 const jsi::PropNameID& name) override {

    auto prop = name.utf8(rt);

    if (prop == "sendFrame") {
      return jsi::Function::createFromHostFunction(
        rt, name, 1,
        [](jsi::Runtime& rt, const jsi::Value&, const jsi::Value* args,
           size_t count) -> jsi::Value {

          auto buf = args[0].asObject(rt).getArrayBuffer(rt);
          gStreamer->send(buf.data(rt), buf.size(rt));
          return jsi::Value::undefined();
        });
    }

    if (prop == "start") {
      return jsi::Function::createFromHostFunction(
        rt, name, 0,
        [](jsi::Runtime& rt, const jsi::Value&, const jsi::Value*, size_t) -> jsi::Value {
          gStreamer->start();
          return true;
        });
    }

    if (prop == "stop") {
      return jsi::Function::createFromHostFunction(
        rt, name, 0,
        [](jsi::Runtime& rt, const jsi::Value&, const jsi::Value*, size_t) -> jsi::Value {
          gStreamer->stop();
          return true;
        });
    }

    return jsi::Value::undefined();
  }
};

// ②  install(runtime)
static void installFastStreaming(jsi::Runtime& rt) {
  auto func = jsi::Function::createFromHostFunction(
    rt, jsi::PropNameID::forAscii(rt, "__loadFastStreaming"), 0,
    [](jsi::Runtime& rt, const jsi::Value&, const jsi::Value*, size_t) -> jsi::Value {

      if (!gStreamer) gStreamer = std::make_shared<FastStreamer>();
      auto host = std::make_shared<FastStreamingHost>();
      return jsi::Object::createFromHostObject(rt, host);
    });

  rt.global().setProperty(rt, "__loadFastStreaming", std::move(func));
}

// ③  VisionCamera Frame-Processor 플러그인 경로 (선택)
extern "C"
JNIEXPORT void JNICALL
Java_com_mrousavy_camera_FrameProcessorPlugins_install(
    JNIEnv*, jobject, jlong runtimePtr) {
  installFastStreaming(*reinterpret_cast<jsi::Runtime*>(runtimePtr));
}

// ④  RN JSRuntime 초기화 경로 호출(안드로이드)
//    MainApplication → getJSIModulePackage 안에서
void installOnRuntime(jsi::Runtime& rt) { installFastStreaming(rt); }
