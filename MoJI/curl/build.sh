#!/bin/bash 
echo "**********************************************************************"
echo "Building Curl and OpenSSL for MOJI ..."
CURL_ROOT="$(pwd)"

case "$(uname)" in
    Linux*) export OS_NAME="linux";;
    Darwin*) export OS_NAME="darwin";;
    CYGWIN*|MINGW*|MSYS*) export OS_NAME="windows" ;;
esac

echo "OS : ${OS_NAME}"
  
# In order to build curl for android, OpenSSL should be built first.
#======================================================
# Build OpenSSL
#======================================================
CURL_OPENSSL_SCRIPTS_ROOT="${CURL_ROOT}/scripts"
OPEN_SSL_BUILD_SCRIPTS="${CURL_ROOT}/scripts/build_openssl.sh"
if [ ! -f "$OPEN_SSL_BUILD_SCRIPTS" ] ; then
    echo "[ERROR] Missing OpenSSL build script : $OPEN_SSL_BUILD_SCRIPTS"
    exit 1
fi

echo "[INFO] Building OpenSSL..."
cd "${CURL_OPENSSL_SCRIPTS_ROOT}" && source "$OPEN_SSL_BUILD_SCRIPTS" || {
    echo "[ERROR] Something wrong while building OPENSSL"
    exit 1
} && {
    echo "[INFO] Succeed to build OpenSSL!"
}

#======================================================
# Build Curl
#======================================================
CURL_BUILD_SCRIPTS="${CURL_ROOT}/scripts/build_curl.sh"
if [ ! -f "$CURL_BUILD_SCRIPTS" ] ; then
    echo "[ERROR] Missing Curl build script : $CURL_BUILD_SCRIPTS"
    exit 1
fi
cd "${CURL_OPENSSL_SCRIPTS_ROOT}" && source "$CURL_BUILD_SCRIPTS" || {
  echo "[ERROR] Something whlie building curl for android!"
  exit 1
}

echo "**********************************************************************"