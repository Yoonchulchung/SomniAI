
echo "[INFO] Builing curl is running ..."
if [ ! -d $ANDROID_NDK_ROOT ] ; then
  echo "[ERROR] Missing Andorid NDK : $ANDROID_NDK_ROOT" >&2
  exit 1
fi

CURL_PATH="$(pwd)/curl"
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

cmake -S ./curl -B ./build -G Ninja \
  -DCMAKE_TOOLCHAIN_FILE="$ANDROID_NDK_ROOT/build/cmake/android.toolchain.cmake" \
  -DANDROID_ABI=arm64-v8a \
  -DANDROID_PLATFORM=android-21 \
  -DBUILD_SHARED_LIBS=OFF -DBUILD_CURL_EXE=OFF -DHTTP_ONLY=ON \
  -DCURL_USE_OPENSSL=ON \
  -DOPENSSL_ROOT_DIR="$OPENSSL_ANDROID" \
  -DOPENSSL_CRYPTO_LIBRARY="$OPENSSL_ANDROID/lib/libcrypto.a" \
  -DOPENSSL_SSL_LIBRARY="$OPENSSL_ANDROID/lib/libssl.a" \
  -DOPENSSL_INCLUDE_DIR="$OPENSSL_ANDROID/include" \
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

ninja -C ./build 

if [ $? -ne 0 ] ; then
  echo "[ERROR] Something wrong while building!"
fi

echo "[INFO] Ninja Build is Completed!"

CURL_ANDROID="$(pwd)/curl-for-android"

# This should be installed in sudo permsission
if [ ! -d "$CURL_ANDROID" ] ; then
  sudo cmake --install ./build --prefix "${CURL_ANDROID}" || {
    echo "[ERROR] Something wrong while Installing!"
    exit 1  
  }
fi

echo "[INFO] Finished Installing! Check out : ${CURL_ANDROID}"