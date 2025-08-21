#include "send-http.h"

bool SendHTTP::sendBufferOverHTTP(const uint8_t* bufferData, size_t bufferSize, 
                const std::string& url) {
                    CURL* curl = curl_easy_init();
                    if (!curl) return false;
                    
                    struct curl_slist* headers = nullptr;
                    headers = curl_slist_append(headers, "Content-Type: application/octet-stream");

                    CURLcode res;

                    curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
                    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
                    curl_easy_setopt(curl, CURLOPT_POST, 1L);
                    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, bufferData);
                    curl_easy_setopt(curl, CURLOPT_POSTFIELDSIZE, bufferSize);

                    res = curl_easy_perform(curl);
                    
                    curl_slist_free_all(headers);
                    curl_easy_cleanup(curl);

                    return (res == CURLE_OK);
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
