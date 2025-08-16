#!/bin/bash 
clear
echo "**********************************************************************"
echo "Building Curl and OpenSSL for MOJI ..."
INSTALL_ROOT="$(pwd)"

NDK_INSTALL_SCRIPTS="$(pwd)/scripts/install_ndk.sh"

case "$(uname)" in
    Linux*) export OS_NAME="linux";;
    Darwin*) export OS_NAME="darwin";;
    CYGWIN*|MINGW*|MSYS*) export OS_NAME="windows" ;;
esac

echo "OS : ${OS_NAME}"

if [ ! -d "$ANDROID_NDK_ROOT" ] ; then
    source "$NDK_INSTALL_SCRIPTS" || {
        echo "[ERROR] Something Wrong while installing NDK"
        exit 1
    }
fi

OPEN_SSL_BUILD_SCRIPTS="$(pwd)/scripts/build_openssl.sh"
if [ ! -f "$OPEN_SSL_BUILD_SCRIPTS" ] ; then
    echo "[ERROR] Missing OpenSSL build script : $OPEN_SSL_BUILD_SCRIPTS"
    exit 1
fi

echo "[INFO] Building OpenSSL..."
source "$OPEN_SSL_BUILD_SCRIPTS" || {
    echo "[ERROR] Something wrong while building OPENSSL"
    exit 1
} && {
    echo "[INFO] Succeed to build OpenSSL!"
}

cd "$INSTALL_ROOT"

CURL_BUILD_SCRIPTS="$(pwd)/scripts/build_curl.sh"
if [ ! -f "$CURL_BUILD_SCRIPTS" ] ; then
    echo "[ERROR] Missing Curl build script : $CURL_BUILD_SCRIPTS"
    exit 1
fi
source "$CURL_BUILD_SCRIPTS"

echo "**********************************************************************"