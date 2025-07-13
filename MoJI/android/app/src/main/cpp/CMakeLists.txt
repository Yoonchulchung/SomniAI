cmake_minimum_required(VERSION 3.22)        # RN 0.71+ 
project(MoJIFastStreaming LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_VERBOSE_MAKEFILE ON)
set(PACKAGE_NAME "MoJI")


file(TO_CMAKE_PATH "${NODE_MODULES_DIR}" NODE_MODULES_DIR)

find_package(ReactAndroid REQUIRED CONFIG )
find_package(fbjni        REQUIRED CONFIG)
find_library(LOG_LIB log)

include_directories(
          ../cpp
          ../cpp/jsi
          "${NODE_MODULES_DIR}/react-native/React"
          "${NODE_MODULES_DIR}/react-native/React/Base"
          "${NODE_MODULES_DIR}/react-native/ReactCommon"
          "${NODE_MODULES_DIR}/react-native/ReactCommon/jsi"
          "${NODE_MODULES_DIR}/react-native/ReactCommon/callinvoker"
          "${NODE_MODULES_DIR}/react-native/ReactAndroid/src/main/jni/react/turbomodule"
)

add_library(${PACKAGE_NAME} SHARED
  moji-fast-streaming.cpp
  moji-fast-streaming.h
  moji-send-frame.cpp
  moji-send-frame.h
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
    ReactAndroid::folly_runtime
    #folly_json
    log
    android                         # Android JNI core
)
