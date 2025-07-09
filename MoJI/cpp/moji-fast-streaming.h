#ifndef MOJI_H
#define MOJI_H

#include <jsi/jslib.h>
#include <jsi/jsi.h>

#include "moji-send-frame.h"
#ifdef __cplusplus

#endif

#ifdef ANDROID
#include <ReactCommon/CallInvoker.h>
#else
#include <React-callinvoker/ReactCommon/CallInvoker.h>
#endif

using namespace facebook;

class MoJIPlugin : public jsi::HostObject {
    private:
        std::shared_ptr<react::CallInvoker> _callInvoker;

    public:
        explicit MoJIPlugin(std::shared_ptr<react::CallInvoker> callInvoker);
        static void installMoJI(jsi::Runtime& runtime, std::shared_ptr<react::CallInvoker> callInvoker);

        jsi::Value get(jsi::Runtime& runtime, const jsi::PropNameID& name) override;
        std::vector<jsi::PropNameID> getPropertyNames(jsi::Runtime& runtime) override;
};

#endif