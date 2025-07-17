#include "moji-send-frame.h"

jsi::Value MoJISend::MoJISendFrame(jsi::Runtime& runtime, const jsi::Value& thisValue, 
            const jsi::Value* arguments, size_t count) {
                jsi::Object arrayBufferObj = arguments[0].asObject(runtime);
                jsi::ArrayBuffer arrayBuffer = arrayBufferObj.getArrayBuffer(runtime);

                uint8_t * bufferData = arrayBuffer.data(runtime);
                size_t bufferSize = arrayBuffer.size(runtime);

                std::string ip = arguments[1].asString(runtime).utf8(runtime);

                uint16_t port = static_cast<uint16_t>(arguments[2].asNumber());
                /* ================================ */

                //MoJISend::sendBufferOverHTTP(bufferData, bufferSize, ip, port);

                MoJISend::sendBufferOverHTTP(bufferData, bufferSize, ip);

                /* ================================ */
                jsi::Object result = jsi::Object(runtime);
                result.setProperty(runtime, "ok", true);
                return result;
}

bool MoJISend::sendBufferOverHTTP((const uint8_t* bufferData, size_t bufferSize, 
                const std::string& url) {
                    CURL* curl = curl_easy_init();
                    if (!curl) return false;

                    CURLcode res;

                    curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
                    curl_easy_setopt(curl, CURLOPT_POST, 1L);
                    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, bufferData);
                    curl_easy_setopt(curl, CURLOPT_POSTFIELDSIZE, bufferSize);

                    res = curl_easy_perform(curl);
                    curl_easy_cleanup(curl);

                    return (res == CURLE_OK);
                }

bool MoJISend::sendBufferOverUDP(const uint8_t* bufferData, size_t bufferSize, 
                const std::string& ip, uint16_t port ) {
                    int sockfd = socket(AF_INET, SOCK_DGRAM, 0);
                    
                    /* Failed to send Data*/
                    if (sockfd < 0) {
                        LOGI("Failed to send data 0");
                        return false;
                    }

                    sockaddr_in destAddr;
                    std::memset(&destAddr, 0, sizeof(destAddr));

                    destAddr.sin_family = AF_INET;
                    destAddr.sin_port = htons(port);
                    destAddr.sin_addr.s_addr = inet_addr(ip.c_str());

                    ssize_t sentBytes = sendto(sockfd, bufferData, bufferSize, 0, (sockaddr*)&destAddr, sizeof(destAddr));
                    if (sentBytes < 0) {
                        LOGI("Failed to send data 1");

                        close(sockfd);
                        return false;
                    }

                    close(sockfd);
                    return true;
                }
