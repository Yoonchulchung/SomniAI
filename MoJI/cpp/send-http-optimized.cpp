/**
 * Optimized HTTP Sender with Connection Pooling
 * Enterprise-grade performance with memory efficiency
 */

#include "send-http.h"
#include <iostream>
#include <thread>
#include <chrono>
#include <mutex>
#include <atomic>
#include <memory>
#include <queue>
#include <sstream>

namespace {
    // Performance metrics
    std::atomic<uint64_t> totalBytesSent{0};
    std::atomic<uint32_t> totalRequests{0};
    std::atomic<uint32_t> successfulRequests{0};
    std::atomic<uint32_t> failedRequests{0};
    std::atomic<uint32_t> totalRetries{0};

    // Connection pool
    constexpr size_t MAX_POOL_SIZE = 5;
    std::mutex poolMutex;
    std::queue<CURL*> connectionPool;

    /**
     * Get CURL handle from pool or create new one
     */
    CURL* acquireCurlHandle() {
        std::lock_guard<std::mutex> lock(poolMutex);

        if (!connectionPool.empty()) {
            CURL* handle = connectionPool.front();
            connectionPool.pop();
            curl_easy_reset(handle);  // Reset for reuse
            return handle;
        }

        return curl_easy_init();
    }

    /**
     * Return CURL handle to pool
     */
    void releaseCurlHandle(CURL* handle) {
        if (!handle) return;

        std::lock_guard<std::mutex> lock(poolMutex);

        if (connectionPool.size() < MAX_POOL_SIZE) {
            connectionPool.push(handle);
        } else {
            curl_easy_cleanup(handle);
        }
    }

    /**
     * Custom write callback to discard response body (we don't need it)
     */
    size_t writeCallback(void* contents, size_t size, size_t nmemb, void* userp) {
        // Discard data to save memory
        return size * nmemb;
    }

    /**
     * Log with timestamp
     */
    void log(const std::string& level, const std::string& message) {
        auto now = std::chrono::system_clock::now();
        auto now_c = std::chrono::system_clock::to_time_t(now);
        std::cout << "[" << level << "] " << std::ctime(&now_c) << " " << message << std::endl;
    }
}

bool SendHTTP::sendBufferOverHTTP(const uint8_t* bufferData, size_t bufferSize,
                const std::string& url, int maxRetries) {

    if (!bufferData || bufferSize == 0) {
        std::cerr << "[SendHTTP] Invalid buffer data" << std::endl;
        return false;
    }

    if (url.empty()) {
        std::cerr << "[SendHTTP] Invalid URL" << std::endl;
        return false;
    }

    totalRequests++;
    auto startTime = std::chrono::high_resolution_clock::now();

    int attempt = 0;
    CURLcode res = CURLE_FAILED_INIT;
    long responseCode = 0;

    while (attempt < maxRetries) {
        CURL* curl = acquireCurlHandle();
        if (!curl) {
            std::cerr << "[SendHTTP] Failed to acquire CURL handle" << std::endl;
            failedRequests++;
            return false;
        }

        struct curl_slist* headers = nullptr;
        headers = curl_slist_append(headers, "Content-Type: application/octet-stream");
        headers = curl_slist_append(headers, "Connection: keep-alive");
        headers = curl_slist_append(headers, "Expect:");  // Disable Expect: 100-continue

        try {
            // Optimized CURL options
            curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
            curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
            curl_easy_setopt(curl, CURLOPT_POST, 1L);
            curl_easy_setopt(curl, CURLOPT_POSTFIELDS, bufferData);
            curl_easy_setopt(curl, CURLOPT_POSTFIELDSIZE, bufferSize);

            // Timeouts
            curl_easy_setopt(curl, CURLOPT_TIMEOUT_MS, 5000L);        // 5 seconds total
            curl_easy_setopt(curl, CURLOPT_CONNECTTIMEOUT_MS, 2000L); // 2 seconds connect

            // SSL/TLS optimization
            curl_easy_setopt(curl, CURLOPT_SSL_VERIFYPEER, 0L);  // Faster for internal networks
            curl_easy_setopt(curl, CURLOPT_SSL_VERIFYHOST, 0L);

            // Performance optimizations
            curl_easy_setopt(curl, CURLOPT_TCP_NODELAY, 1L);      // Disable Nagle's algorithm
            curl_easy_setopt(curl, CURLOPT_TCP_KEEPALIVE, 1L);    // Enable TCP keepalive
            curl_easy_setopt(curl, CURLOPT_NOSIGNAL, 1L);         // Thread-safe
            curl_easy_setopt(curl, CURLOPT_VERBOSE, 0L);

            // Discard response body
            curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, writeCallback);

            // HTTP/2 support if available
            curl_easy_setopt(curl, CURLOPT_HTTP_VERSION, CURL_HTTP_VERSION_2_0);

            // Connection reuse
            curl_easy_setopt(curl, CURLOPT_FORBID_REUSE, 0L);
            curl_easy_setopt(curl, CURLOPT_FRESH_CONNECT, 0L);

            // Perform request
            res = curl_easy_perform(curl);

            if (res == CURLE_OK) {
                curl_easy_getinfo(curl, CURLINFO_RESPONSE_CODE, &responseCode);

                if (responseCode == 200 || responseCode == 201 || responseCode == 204) {
                    // Success metrics
                    totalBytesSent += bufferSize;
                    successfulRequests++;
                    totalRetries += attempt;

                    auto endTime = std::chrono::high_resolution_clock::now();
                    auto duration = std::chrono::duration_cast<std::chrono::milliseconds>(
                        endTime - startTime
                    ).count();

                    if (attempt > 0) {
                        std::cout << "[SendHTTP] Success after " << (attempt + 1)
                                  << " attempts (" << duration << "ms, "
                                  << bufferSize << " bytes)" << std::endl;
                    }

                    curl_slist_free_all(headers);
                    releaseCurlHandle(curl);
                    return true;
                }

                std::cerr << "[SendHTTP] HTTP error " << responseCode
                          << " (attempt " << (attempt + 1) << "/" << maxRetries << ")"
                          << std::endl;
            } else {
                std::cerr << "[SendHTTP] CURL error: " << curl_easy_strerror(res)
                          << " (attempt " << (attempt + 1) << "/" << maxRetries << ")"
                          << std::endl;
            }

            curl_slist_free_all(headers);
            releaseCurlHandle(curl);

        } catch (const std::exception& e) {
            std::cerr << "[SendHTTP] Exception: " << e.what() << std::endl;
            curl_slist_free_all(headers);
            releaseCurlHandle(curl);
            failedRequests++;
            return false;
        }

        attempt++;

        // Adaptive exponential backoff
        if (attempt < maxRetries) {
            int backoffMs = std::min(50 * (1 << attempt), 1000);  // Max 1 second
            std::this_thread::sleep_for(std::chrono::milliseconds(backoffMs));
        }
    }

    failedRequests++;
    std::cerr << "[SendHTTP] Failed after " << maxRetries << " attempts" << std::endl;
    return false;
}

bool SendHTTP::sendBufferOverUDP(const uint8_t* bufferData, size_t bufferSize,
                const std::string& ip, uint16_t port) {

    if (!bufferData || bufferSize == 0) {
        std::cerr << "[SendUDP] Invalid buffer data" << std::endl;
        return false;
    }

    int sockfd = socket(AF_INET, SOCK_DGRAM, 0);
    if (sockfd < 0) {
        std::cerr << "[SendUDP] Failed to create socket" << std::endl;
        return false;
    }

    // Set socket options for performance
    int optval = 1;
    setsockopt(sockfd, SOL_SOCKET, SO_REUSEADDR, &optval, sizeof(optval));

    // Set send buffer size
    int sendBufferSize = 1024 * 1024;  // 1MB
    setsockopt(sockfd, SOL_SOCKET, SO_SNDBUF, &sendBufferSize, sizeof(sendBufferSize));

    sockaddr_in destAddr{};
    destAddr.sin_family = AF_INET;
    destAddr.sin_port = htons(port);
    destAddr.sin_addr.s_addr = inet_addr(ip.c_str());

    ssize_t sentBytes = sendto(
        sockfd,
        bufferData,
        bufferSize,
        0,
        reinterpret_cast<sockaddr*>(&destAddr),
        sizeof(destAddr)
    );

    close(sockfd);

    if (sentBytes < 0) {
        std::cerr << "[SendUDP] Failed to send data" << std::endl;
        return false;
    }

    if (static_cast<size_t>(sentBytes) != bufferSize) {
        std::cerr << "[SendUDP] Partial send: " << sentBytes << "/" << bufferSize << std::endl;
        return false;
    }

    totalBytesSent += bufferSize;
    return true;
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
