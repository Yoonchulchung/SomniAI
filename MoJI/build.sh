#!/bin/bash

echo "Building MoJI Application..."
MOJI_ROOT="$(pwd)"

CURL_PATH="$(pwd)/curl/curl_output"

if [ ! -d "$CURL_PATH" ] ; then
    echo "Installing Curl for Android ..."
    cd "${CURL_PATH%/*}" ; ./build.sh || {
        echo "[ERROR] Something wrong while installing curl for android!"
        exit 1
    }
fi

cd "$MOJI_ROOT"

cd android ; ./gradlew clean
npx react-native run-android
