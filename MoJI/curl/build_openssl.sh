#!/bin/bash
set -e
export ANDROID_NDK_HOME=/home/yoonchul/Android/Sdk/ndk/26.1.10909125/

ANDROID_NDK=/home/yoonchul/Android/Sdk/ndk/26.1.10909125
TOOLCHAIN=$ANDROID_NDK/toolchains/llvm/prebuilt/linux-x86_64
PATH=$TOOLCHAIN/bin:$PATH

API=21
TARGET=aarch64-linux-android
CROSS_COMPILE=${TARGET}${API}-
PREFIX=$(pwd)/openssl-android-install

cd openssl
git checkout OpenSSL_1_1_1w

perl Configure android-arm64 \
     --cross-compile-prefix=$CROSS_COMPILE \
     -D__ANDROID_API__=$API \
     --prefix=$PREFIX \
     no-shared

make -j$(nproc)
make install_sw 
