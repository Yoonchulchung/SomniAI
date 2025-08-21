
#include <cstdint>
#include <string>
#include <vector>
#include <iostream>

#include "main.h"


int main() {
    std::vector<uint8_t> buf(3*224*224);
    for (size_t i = 0; i < buf.size(); ++i) buf[i] = static_cast<uint8_t>(i & 0xFF);

    std::string url = "http://127.0.0.1:8000/upload/http_1_1";

    std::cout << url << std::endl;
    bool ok = SendHTTP::sendBufferOverHTTP(buf.data(), buf.size(), url);
    return 0;
}
