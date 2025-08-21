#include <curl/curl.h>

/* ========== UDP Socket Send ======== */
#include <iostream>
#include <cstring>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <unistd.h>

class SendHTTP {
    
    public:
        static bool sendBufferOverHTTP(const uint8_t* bufferData, size_t bufferSize, const std::string& url);

        static bool sendBufferOverUDP(const uint8_t* bufferData, size_t bufferSize, const std::string& ip, uint16_t port );       
};