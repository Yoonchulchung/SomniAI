export ANDROID_NDK_HOME=/home/yoonchul/Android/Sdk/ndk/26.1.10909125/
export OPENSSL_HOME="$(pwd)/openssl-android-install"


cmake -S ./curl -B ./build -G Ninja \
  -DCMAKE_TOOLCHAIN_FILE="$ANDROID_NDK_HOME/build/cmake/android.toolchain.cmake" \
  -DANDROID_ABI=arm64-v8a \
  -DANDROID_PLATFORM=android-21 \
  -DBUILD_SHARED_LIBS=OFF -DBUILD_CURL_EXE=OFF -DHTTP_ONLY=ON \
  -DCURL_USE_OPENSSL=ON \
  -DOPENSSL_ROOT_DIR="$OPENSSL_HOME" \
  -DOPENSSL_CRYPTO_LIBRARY="$OPENSSL_HOME/lib/libcrypto.a" \
  -DOPENSSL_SSL_LIBRARY="$OPENSSL_HOME/lib/libssl.a" \
  -DOPENSSL_INCLUDE_DIR="$OPENSSL_HOME/include" \
  -DCURL_BROTLI=OFF \
  -DCURL_ZSTD=OFF \
  -DCURL_NGHTTP2=OFF \
  -DCURL_USE_LIBIDN2=OFF \
  -DCURL_USE_LIBPSL=OFF


echo "\n\n====== CMake Configure/Generate is Completed! ==== \n\n"

ninja -C ./build 

echo "\n\n====== Ninja Build is Completed! ==== \n\n"

sudo cmake --install ./build --prefix "$(pwd)/curl_output"

echo "\n\n====== Finished Installing! ======== \n\n"
