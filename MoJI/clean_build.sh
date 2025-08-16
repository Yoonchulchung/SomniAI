#!/bin/bash
clear
echo "Clean building MoJI Application..."
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

watchman watch-del-all || true
sudo rm -rf node_modules android/.gradle android/.cxx \
       android/app/build android/app/.cxx ~/.gradle

npm install

cd android && ./gradlew clean && ./gradlew build

#npx react-native run-android
