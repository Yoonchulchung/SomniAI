#!/bin/bash 
echo "**********************************************************************"
echo "Building Curl and OpenSSL for MOJI ..."
INSTALL_ROOT="$(pwd)"

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

#======================================================
# Build Curl
#======================================================
CURL_BUILD_SCRIPTS="$(pwd)/scripts/build_curl.sh"
if [ ! -f "$CURL_BUILD_SCRIPTS" ] ; then
    echo "[ERROR] Missing Curl build script : $CURL_BUILD_SCRIPTS"
    exit 1
fi
source "$CURL_BUILD_SCRIPTS" || {
  echo "[ERROR] Something whlie building curl for android!"
  exit 1
}

echo "**********************************************************************"
cd "$INSTALL_ROOT"