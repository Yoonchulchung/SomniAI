#include "send-http.h"
#include <iostream>
#include <thread>
#include <chrono>
#include <mutex>
#include <atomic>
#include <memory>
#include <queue>
#include <sstream>
#include <vector>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <unistd.h> 
#include <curl/curl.h>
#include <android/log.h>

#define LOG_TAG "MoJi_CPP"
#define LOGD(...) __android_log_print(ANDROID_LOG_DEBUG, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)

namespace {
    std::atomic<uint64_t> totalBytesSent{0};
    std::atomic<uint32_t> totalRequests{0};
    std::atomic<uint32_t> successfulRequests{0};
    std::atomic<uint32_t> failedRequests{0};
    std::atomic<uint32_t> totalRetries{0};

    constexpr size_t MAX_POOL_SIZE = 5;
    std::mutex poolMutex;
    std::queue<CURL*> connectionPool;
    
    std::once_flag curlInitFlag;
    
    void initGlobalCurl() {
        std::call_once(curlInitFlag, []() {
            curl_global_init(CURL_GLOBAL_ALL);
        });
    }

    CURL* acquireCurlHandle() {
        initGlobalCurl();

        std::lock_guard<std::mutex> lock(poolMutex);
        if (!connectionPool.empty()) {
            CURL* handle = connectionPool.front();
            connectionPool.pop();
            curl_easy_reset(handle);
            return handle;
        }
        return curl_easy_init();
    }

    void releaseCurlHandle(CURL* handle) {
        if (!handle) return;
        std::lock_guard<std::mutex> lock(poolMutex);
        if (connectionPool.size() < MAX_POOL_SIZE) {
            connectionPool.push(handle);
        } else {
            curl_easy_cleanup(handle);
        }
    }

    size_t writeCallback(void* contents, size_t size, size_t nmemb, void* userp) {
        return size * nmemb;
    }
}

bool SendHTTP::sendBufferOverHTTP(const uint8_t* bufferData, size_t bufferSize,
                const std::string& url, int maxRetries) {

    if (!bufferData || bufferSize == 0 || url.empty()) {
        return false;
    }

    totalRequests++;
    
    const long CONNECT_TIMEOUT_MS = 2000L; 
    const long TOTAL_TIMEOUT_MS = 5000L; 

    int attempt = 0;

    while (attempt < maxRetries) {
        CURL* curl = acquireCurlHandle();
        if (!curl) {
            failedRequests++;
            return false;
        }

        struct curl_slist* headers = nullptr;
        struct curl_slist* temp = curl_slist_append(headers, "Content-Type: application/octet-stream");
        if (temp) headers = temp;
        temp = curl_slist_append(headers, "Connection: keep-alive");
        if (temp) headers = temp;
        temp = curl_slist_append(headers, "Expect:");
        if (temp) headers = temp;

        CURLcode res = CURLE_FAILED_INIT;

        try {
            curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
            curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers); 
            curl_easy_setopt(curl, CURLOPT_POST, 1L);
            curl_easy_setopt(curl, CURLOPT_POSTFIELDS, bufferData);
            curl_easy_setopt(curl, CURLOPT_POSTFIELDSIZE, (long)bufferSize);

            // 타임아웃 필요함
            curl_easy_setopt(curl, CURLOPT_TIMEOUT_MS, TOTAL_TIMEOUT_MS);
            curl_easy_setopt(curl, CURLOPT_CONNECTTIMEOUT_MS, CONNECT_TIMEOUT_MS);

            curl_easy_setopt(curl, CURLOPT_SSL_VERIFYPEER, 0L);
            curl_easy_setopt(curl, CURLOPT_SSL_VERIFYHOST, 0L);
            curl_easy_setopt(curl, CURLOPT_TCP_NODELAY, 1L);
            curl_easy_setopt(curl, CURLOPT_NOSIGNAL, 1L); // 멀티스레드 크래시 방지
            curl_easy_setopt(curl, CURLOPT_VERBOSE, 0L);
            curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, writeCallback);
            curl_easy_setopt(curl, CURLOPT_FOLLOWLOCATION, 1L);
            
            res = curl_easy_perform(curl);

            long responseCode = 0;
            if (res == CURLE_OK) {
                curl_easy_getinfo(curl, CURLINFO_RESPONSE_CODE, &responseCode);
                if (responseCode >= 200 && responseCode < 300) {

                    if (headers) curl_slist_free_all(headers);
                    releaseCurlHandle(curl);
                    return true;
                } else {
                    LOGE("[error] HTTP Error: %ld", responseCode); 
                }
            } else {
                LOGE("[error] CURL Error: %s (Code: %d)", curl_easy_strerror(res), res);
            }
            
        } catch (...) {
            //모르겄다... 예외는 어떻게 처리하면 좋죠..?
        }

        if (headers) curl_slist_free_all(headers);
        releaseCurlHandle(curl);

        attempt++;
        
        // Retry
        if (attempt < maxRetries) {
            std::this_thread::sleep_for(std::chrono::milliseconds(10 * attempt));
        }
    }

    failedRequests++;
    return false;
}

bool SendHTTP::sendBufferOverUDP(const uint8_t* bufferData, size_t bufferSize,
                const std::string& ip, uint16_t port) {
    
    if (!bufferData || bufferSize == 0) return false;

    int sockfd = socket(AF_INET, SOCK_DGRAM, 0);
    if (sockfd < 0) return false;

    sockaddr_in destAddr{};
    destAddr.sin_family = AF_INET;
    destAddr.sin_port = htons(port);
    
    // inet_addr (구식) -> inet_pton (최신 표준)
    if (inet_pton(AF_INET, ip.c_str(), &destAddr.sin_addr) <= 0) {
        close(sockfd);
        return false;
    }

    ssize_t sentBytes = sendto(sockfd, bufferData, bufferSize, 0,
                             (struct sockaddr*)&destAddr, sizeof(destAddr));

    close(sockfd);
    return (sentBytes == (ssize_t)bufferSize);
}

/**
 * Get performance statistics
 */
void SendHTTP::getStats(uint64_t& bytesSent, uint32_t& requests,
                        uint32_t& successful, uint32_t& failed, uint32_t& retries) {
    bytesSent = totalBytesSent.load();
    requests = totalRequests.load();
    successful = successfulRequests.load();
    failed = failedRequests.load();
    retries = totalRetries.load();
}

/**
 * Reset statistics
 */
void SendHTTP::resetStats() {
    totalBytesSent = 0;
    totalRequests = 0;
    successfulRequests = 0;
    failedRequests = 0;
    totalRetries = 0;
}

/**
 * Cleanup connection pool
 */
void SendHTTP::cleanup() {
    std::lock_guard<std::mutex> lock(poolMutex);

    while (!connectionPool.empty()) {
        CURL* handle = connectionPool.front();
        connectionPool.pop();
        curl_easy_cleanup(handle);
    }
}
