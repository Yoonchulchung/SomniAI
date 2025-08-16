#!/bin/bash

NDK_TAG="r26d"
NDK_BASENAME="android-ndk-${NDK_TAG}"

NDK_ZIP_FILE="${NDK_BASENAME}-${OS_NAME}.zip"
INSTALL_DIR="$(pwd)/${NDK_BASENAME}"

if [ -d "$ANDROID_NDK_ROOT" ] ; then
    echo "[INFO] Found Installed NDK : ${ANDROID_NDK_ROOT}"
    exit 0
fi

if [ ! -f "$NDK_ZIP_FILE" ] ; then
    echo "[INFO] Downloading NDK ${NDK_TAG} from Google..."
    sleep 1
    wget "https://dl.google.com/android/repository/${NDK_ZIP_FILE}" || {
        echo "[Error] Failed to Download NDK ${NDK_TAG} from Google !"
        exit 1
    }
    echo "[INFO] Succed to download file from Google !"
fi

if [ ! -d "$INSTALL_DIR" ] ; then
    echo "[Info] Unzipng NDK ${NDK_TAG} Zip file ..."
    unzip -q -o "${NDK_ZIP_FILE}" || {
        echo "[Error] Something wrong while unziping ${NDK_ZIP_FILE}"
        exit 1
    }    
fi

export ANDROID_NDK_ROOT="$(pwd)/android-ndk-${NDK_TAG}"
echo "[INFO] ANDROID_NDK_ROOT path is : ${ANDROID_NDK_ROOT}"