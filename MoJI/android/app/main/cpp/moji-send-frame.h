#ifndef MOJI_SEND_H
#define MOJI_SEND_H

#include <jsi/jsi.h>

#ifdef __cplusplus

#endif

class MoJISend {

    public:
        static jsi::Value MoJISendFrame(jsi::Runtime& runtime, const jsi::Value& thisValue, 
            const jsi::Value* arguments, size_t count);
};

#endif