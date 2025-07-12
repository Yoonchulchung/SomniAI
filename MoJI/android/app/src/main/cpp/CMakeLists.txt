cmake_minimum_required(VERSION 3.22)        # RN 0.71+ 
project(MoJIFastStreaming LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_VERBOSE_MAKEFILE ON)
set(PACKAGE_NAME "MoJI")


file(TO_CMAKE_PATH "${NODE_MODULES_DIR}" NODE_MODULES_DIR)

find_package(ReactAndroid REQUIRED CONFIG )
find_package(fbjni        REQUIRED CONFIG)
find_library(LOG_LIB log)

add_library(${PACKAGE_NAME} SHARED
  moji-fast-streaming.cpp
  moji-send-frame.cpp
  cpp-installer.cpp
)

target_include_directories(${PACKAGE_NAME}
  PRIVATE
    "${NODE_MODULES_DIR}/react-native/ReactCommon/callinvoker"
    "${NODE_MODULES_DIR}/react-native/ReactCommon" 
)

target_link_libraries(
    ${PACKAGE_NAME}
    ReactAndroid::jsi               # RN: JSI
    ReactAndroid::reactnativejni    # RN: JNI Utils (e.g. CallInvoker)
    fbjni::fbjni                    # fbjni
    folly_json
    log
    android                         # Android JNI core
)
