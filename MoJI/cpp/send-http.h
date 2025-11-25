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
        static bool sendBufferOverHTTP(const uint8_t* bufferData, size_t bufferSize, const std::string& url, int maxRetries = 3);

        static bool sendBufferOverUDP(const uint8_t* bufferData, size_t bufferSize, const std::string& ip, uint16_t port);
        static void getStats(uint64_t& bytesSent, uint32_t& requests, uint32_t& successful, uint32_t& failed, uint32_t& retries);

        static void resetStats();
        static void cleanup();
};