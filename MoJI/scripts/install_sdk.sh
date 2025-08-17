#!/bin/bash

SDK_ROOT="$(pwd)/android_sdk"
SDK_TMP="${SDK_ROOT}/tmp"
SDK_PATH="${SDK_ROOT}/cmdline-tools/latest"

case "$(uname)" in
    Darwin**) OS_NAME="mac" ;;
    Linux**) OS_NAME="linux" ;;
esac

if [ -d "${SDK_PATH}" ] ; then
    echo "[INFO] SDK Found : ${SDK_PATH}"
    return 0
fi

SDK_DOWNLOAD_PATH="$(pwd)/tmp"

if [ ! -d "$SDK_DOWNLOAD_PATH" ] ; then
    mkdir "$SDK_DOWNLOAD_PATH"
fi

SDK_ZIP_FILE="${SDK_DOWNLOAD_PATH}/SDK-${OS_NAME}.zip"

if [ ! -f "${SDK_ZIP_FILE}" ] ; then 
    echo "[INFO] Downloading SDK Zip file ..."
    wget -O "${SDK_ZIP_FILE}" "https://dl.google.com/android/repository/commandlinetools-${OS_NAME}-13114758_latest.zip" || {
        echo "[ERROR] Something wrong while downloading SDK Zip File!"
        exit 1
    }
fi

if [ -f "${SDK_ZIP_FILE}" ] ; then
    mkdir -p "${SDK_ROOT}"
    unzip "${SDK_ZIP_FILE}" -d "${SDK_TMP}" || {
        echo "[ERROR] Something wrong while unziping SDK Zip File!"
        rm -rf "${SDK_TMP}"
        exit 1
    }
fi

if [ ! -d "$SDK_PATH" ] ; then
    mkdir -p "${SDK_PATH}"
    mv "${SDK_TMP}/cmdline-tools/"* "${SDK_PATH}/" || {
        rm -rf "${SDK_PATH}"
        exit 1
    }
    rm -rf "${SDK_DOWNLOAD_PATH}"
fi