#include <jsi/jsi.h>
#include <sys/socket.h>
#include <arpa/inet.h>
#include <unistd.h>


void sendFrameToAddress(jsi::Runtie &rt, const jsi::Value *args, const string ip_address, size_t count) {

    if (count < 1 || !args[0].isObject()) return;

    auto buffer = args[0].asObject(rt).getArrayBuffer(rt);



}