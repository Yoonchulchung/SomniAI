#ifndef MOJI_SEND_H
#define MOJI_SEND_H

#include <jsi/jsi.h>
#include <android/log.h>

#include <thread>

#define LOG_TAG "MoJIPlugin"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#define LOGD(...) __android_log_print(ANDROID_LOG_DEBUG, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)


#ifdef __cplusplus

#endif
using namespace facebook;

class MoJISend {

    public:
        static jsi::Value MoJISendFrame(jsi::Runtime& runtime, const jsi::Value& thisValue, 
            const jsi::Value* arguments, size_t count);
};

#endif
