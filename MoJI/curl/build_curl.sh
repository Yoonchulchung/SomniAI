

export ANDROID_NDK_HOME=/home/yoonchul/Android/Sdk/ndk/26.1.10909125/

cmake -S ./curl -B ../build -G Ninja \
    -DCMAKE_TOOLCHAIN_FILE=$ANDROID_NDK_HOME/build/cmake/android.toolchain.cmake \
    -DANDROID_ABI=arm64-v8a \
    -DANDROID_PLATFORM=android-21 \
    -DCURL_STATICLIB=ON \
    -DBUILD_CURL_EXE=OFF \
    -DBUILD_SHARED_LIBS=OFF \
    -DHTTP_ONLY=ON \
    -OPENSSL_CRYPTO_LIBRARY_OPENSSL_INCLUDE_DIR