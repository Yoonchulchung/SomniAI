#!/bin/bash

NDK_VERSION="${1}"
NDK_TAG="${NDK_VERSION%%.*}"
NDK_ZIP_FILE="android-ndk-r${NDK_TAG}d-${OS_NAME}.zip"
NDK_INSTALL_PATH="${2}"

if [ -d "$ANDROID_NDK_ROOT" ] ; then
    echo "[INFO] Found Installed NDK : ${ANDROID_NDK_ROOT}"
    exit 0
fi

#======================================================
# Download NDK Zip File
#======================================================
echo "[INFO] Installing NDK ${NDK_VERSION}..."

if [ ! -f "${NDK_INSTALL_PATH}/${NDK_ZIP_FILE}" ] ; then
    echo "[INFO] Downloading NDK ${NDK_TAG} from Google to ${NDK_INSTALL_PATH}/${NDK_ZIP_FILE}"
    # NDK 27 : https://dl.google.com/android/repository/android-ndk-r27d-darwin.dmg, but you can download **darwin.zip
    sleep 1
    wget "https://dl.google.com/android/repository/${NDK_ZIP_FILE}" -O "${NDK_INSTALL_PATH}/${NDK_ZIP_FILE}" || {
        echo "[Error] Failed to Download NDK ${NDK_TAG} from Google !"
        exit 1
    }
    echo "[INFO] Succed to download file from Google !"
fi

#======================================================
# Unzip NDK Zip File    
#======================================================
if [ ! -d "$ANDROID_NDK_ROOT" ] ; then   
    echo "[INFO] Unzipng NDK ${NDK_TAG} Zip file to ${NDK_INSTALL_PATH}"
    unzip -q "${NDK_INSTALL_PATH}/${NDK_ZIP_FILE}" -d "${NDK_INSTALL_PATH}" || {
        echo "[Error] Something wrong while unziping ${NDK_ZIP_FILE}"
        exit 1
    }
    mkdir -p "${ANDROID_NDK_ROOT}"
    echo "[INFO] Copying NDK files to ${ANDROID_NDK_ROOT}"
    cp -r "${NDK_INSTALL_PATH}/${NDK_ZIP_FILE%-*}/"* "${ANDROID_NDK_ROOT}" || {
        echo "[ERROR] Something wrong while moving files!"
        rm -rf ${ANDROID_NDK_ROOT}
        exit 1
    }
fi

if [ ! -d "${ANDROID_NDK_ROOT}" ] ; then
    echo "[ERROR] Something while installing NDK!"
    exit 1
fi