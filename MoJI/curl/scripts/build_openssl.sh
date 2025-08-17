#!/bin/bash
set -e
#======================================================
# Check NDK
#======================================================
# NDK should be installed before build OpenSSL
TOOLCHAIN="${ANDROID_NDK_ROOT}/toolchains/llvm/prebuilt/${OS_NAME}-x86_64"
if [ ! -d "$TOOLCHAIN" ] ; then
     echo "[ERROR] Missing toolchains : ${TOOLCHAIN}"
     echo "[ERROR] Please install NDK First!"
     exit 1
fi

PATH=$TOOLCHAIN/bin:$PATH

#======================================================
# Download OpenSSL
#======================================================
OPENSSL_PATH="$(pwd)/openssl"
if [ ! -d "$OPENSSL_PATH" ] ; then 
     echo "[INFO] Downloading OpenSSL ..."
     git submodule update --init --recursive || {
          git clone https://github.com/openssl/openssl.git || {
               echo "[ERROR] Failed to download OpenSSL"
               exit 1
          }
     }
fi

# cd openssl && git checkout OpenSSL_1_1_1w || {
#      echo "[ERROR] Something wrong while checking OpenSSL"
#      exit 1
# }

INSTALL_OPEN_SSL_ROOT="$(pwd)/openssl-android"
PREFIX="${INSTALL_OPEN_SSL_ROOT}/output"
export OPENSSL_HOME="${PREFIX}"

echo "PRFIX PATH : ${PREFIX}"

if [ ! -d "$INSTALL_OPEN_SSL_ROOT" ] ; then
     mkdir "$INSTALL_OPEN_SSL_ROOT"
fi

cd "$INSTALL_OPEN_SSL_ROOT"
echo "[INFO] Configuring OpenSSL for android-arm64 : $PREFIX"

if [ -d "$PREFIX" ] ; then
     echo "[INFO] Found Built OpenSSL : ${PREFIX}"
     return 0
fi

API=21
TARGET="aarch64-${OS_NAME}-android"
CROSS_COMPILE=${TARGET}${API}-
     
perl "${OPENSSL_PATH}"/Configure android-arm64 \
     --cross-compile-prefix=$CROSS_COMPILE \
     -D__ANDROID_API__=$API \
     --prefix=$PREFIX \
     no-shared || {
          echo "[ERROR] Failed to Configure OpenSSL"
          exit 1
     }

if [ ! -d "$PREFIX" ] ; then
     echo "[INFO] make ..."
     make -j$(nproc)
     make install_sw 
fi
