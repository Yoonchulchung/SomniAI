
set -euo pipefail

echo "[INFO] Builing curl is running ..."

if [ ! -d $ANDROID_NDK_ROOT ] ; then
    echo "[ERROR] Missing Andorid NDK : $ANDROID_NDK_ROOT" >&2
    exit 1
fi

if [ -d $CURL_ANDROID_ROOT ] ; then
    echo "[INFO] Found curl for android : ${CURL_ANDROID_ROOT}"
    return 0
fi

CURL_PATH="${CURL_ROOT}/curl"
if [ ! -d "$CURL_PATH" ] ; then
    echo "[ERROR] Missing Curl : ${CURL_PATH}"
    echo "[INFO] Downloading Curl from GIT"
    git submodule update --init --recursive || {
        git clone https://github.com/curl/curl || {
            echo "[ERROR] Failed to download Curl"
            exit 1
          }
     }
fi

# Check out build_openssl.sh if OPENSSL_ANDROID path is weird.

cmake -S "${CURL_PATH}" -B "${CURL_ROOT}"/curl_build -G Ninja \
    -DCMAKE_TOOLCHAIN_FILE="$ANDROID_NDK_ROOT/build/cmake/android.toolchain.cmake" \
    -DANDROID_ABI=arm64-v8a \
    -DANDROID_PLATFORM=android-21 \
    -DBUILD_SHARED_LIBS=OFF -DBUILD_CURL_EXE=OFF -DHTTP_ONLY=ON \
    -DCURL_USE_OPENSSL=ON \
    -DOPENSSL_ROOT_DIR="$OPENSSL_ANDROID_ROOT" \
    -DOPENSSL_CRYPTO_LIBRARY="$OPENSSL_ANDROID_ROOT/lib/libcrypto.a" \
    -DOPENSSL_SSL_LIBRARY="$OPENSSL_ANDROID_ROOT/lib/libssl.a" \
    -DOPENSSL_INCLUDE_DIR="$OPENSSL_ANDROID_ROOT/include" \
    -DCURL_BROTLI=OFF \
    -DCURL_ZSTD=OFF \
    -DCURL_NGHTTP2=OFF \
    -DCURL_USE_LIBIDN2=OFF \
    -DCURL_USE_LIBPSL=OFF

if [ $? -ne 0 ] ; then
    echo "[ERROR] Something wrong while doing cmake configure/generate !"
    exit 1 
fi

echo "[INFO] CMake Configure/Generate is Completed!"

ninja -C "${CURL_ROOT}"/curl_build 

if [ $? -ne 0 ] ; then
    echo "[ERROR] Something wrong while building!"
fi

echo "[INFO] Ninja Build is Completed!"
