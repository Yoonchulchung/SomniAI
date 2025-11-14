#include "send-http.h"
#include <iostream>
#include <thread>
#include <chrono>

bool SendHTTP::sendBufferOverHTTP(const uint8_t* bufferData, size_t bufferSize,
                const std::string& url, int maxRetries) {

                    int attempt = 0;
                    CURLcode res;
                    long response_code = 0;

                    while (attempt < maxRetries) {
                        CURL* curl = curl_easy_init();
                        if (!curl) {
                            std::cerr << "[SendHTTP] Failed to initialize CURL" << std::endl;
                            return false;
                        }

                        struct curl_slist* headers = nullptr;
                        headers = curl_slist_append(headers, "Content-Type: application/octet-stream");

                        // Set curl options
                        curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
                        curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
                        curl_easy_setopt(curl, CURLOPT_POST, 1L);
                        curl_easy_setopt(curl, CURLOPT_POSTFIELDS, bufferData);
                        curl_easy_setopt(curl, CURLOPT_POSTFIELDSIZE, bufferSize);

                        // Set timeouts
                        curl_easy_setopt(curl, CURLOPT_TIMEOUT, 10L);           // 10 seconds total timeout
                        curl_easy_setopt(curl, CURLOPT_CONNECTTIMEOUT, 5L);     // 5 seconds connection timeout

                        // SSL verification
                        curl_easy_setopt(curl, CURLOPT_SSL_VERIFYPEER, 1L);
                        curl_easy_setopt(curl, CURLOPT_SSL_VERIFYHOST, 2L);

                        // Disable verbose output in production
                        curl_easy_setopt(curl, CURLOPT_VERBOSE, 0L);

                        // Perform the request
                        res = curl_easy_perform(curl);

                        if (res == CURLE_OK) {
                            // Check HTTP response code
                            curl_easy_getinfo(curl, CURLINFO_RESPONSE_CODE, &response_code);

                            curl_slist_free_all(headers);
                            curl_easy_cleanup(curl);

                            if (response_code == 200) {
                                std::cout << "[SendHTTP] Success: HTTP " << response_code << std::endl;
                                return true;
                            } else {
                                std::cerr << "[SendHTTP] Error: HTTP " << response_code << " (attempt " << (attempt + 1) << "/" << maxRetries << ")" << std::endl;
                            }
                        } else {
                            std::cerr << "[SendHTTP] Error: " << curl_easy_strerror(res) << " (attempt " << (attempt + 1) << "/" << maxRetries << ")" << std::endl;
                        }

                        curl_slist_free_all(headers);
                        curl_easy_cleanup(curl);

                        attempt++;

                        // Exponential backoff before retry
                        if (attempt < maxRetries) {
                            int backoff_ms = 100 * (1 << attempt); // 200ms, 400ms, 800ms...
                            std::this_thread::sleep_for(std::chrono::milliseconds(backoff_ms));
                        }
                    }

                    std::cerr << "[SendHTTP] Failed after " << maxRetries << " attempts" << std::endl;
                    return false;
                }

bool SendHTTP::sendBufferOverUDP(const uint8_t* bufferData, size_t bufferSize, 
                const std::string& ip, uint16_t port ) {
                    int sockfd = socket(AF_INET, SOCK_DGRAM, 0);
                    
                    /* Failed to send Data*/
                    if (sockfd < 0) {
                        return false;
                    }

                    sockaddr_in destAddr;
                    std::memset(&destAddr, 0, sizeof(destAddr));

                    destAddr.sin_family = AF_INET;
                    destAddr.sin_port = htons(port);
                    destAddr.sin_addr.s_addr = inet_addr(ip.c_str());

                    ssize_t sentBytes = sendto(sockfd, bufferData, bufferSize, 0, (sockaddr*)&destAddr, sizeof(destAddr));
                    if (sentBytes < 0) {

                        close(sockfd);
                        return false;
                    }

                    close(sockfd);
                    return true;
                }
