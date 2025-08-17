#!/bin/bash
clear

export ANDROID_HOME="$(pwd)/android_sdk"
export ANDROID_SDK_ROOT="${ANDROID_HOME}"

case "$(uname)" in
    Linux*) export OS_NAME="linux";;
    Darwin*) export OS_NAME="darwin";;
    CYGWIN*|MINGW*|MSYS*) export OS_NAME="windows" ;;
esac

echo "OS : ${OS_NAME}"

# Before Install, NDK and SDK should be ready to use!
# Required such path
# android_sdk/
#   ├──cmdline-tools/
#   │   ├──latest/
#   │       ├──bin/sdkmanager
#   ├─platform-tools/
#   ├─ndk/
#======================================================
# Install NDK
#======================================================
# Select NDK Version
# NDK 27 is not available because react-native-worklets-core not accepts 27.0.12077973.
# But We never tested 27.3.13750724 because we already setted ndk version to 26
case "${1:-26}" in
    26*) NDK_VERSION="26.1.10909125" ;;
    27*) NDK_VERSION="27.3.13750724" ;;
esac

NDK_INSTALL_SCRIPTS="$(pwd)/scripts/install_ndk.sh"
export ANDROID_NDK_ROOT="${ANDROID_SDK_ROOT}/ndk/${NDK_VERSION}"
NDK_INSTALL_PATH="${ANDROID_SDK_ROOT}/ndk/download"

echo "[INFO] Install NDK Version : ${NDK_VERSION}"

if [ ! -d "$ANDROID_NDK_ROOT" ] ; then
    mkdir -p "${NDK_INSTALL_PATH}"
    source "$NDK_INSTALL_SCRIPTS" "$NDK_VERSION" "$NDK_INSTALL_PATH" || {
        echo "[ERROR] Something Wrong while installing NDK"
        rm -rf "${NDK_INSTALL_PATH}"
        exit 1
    }
fi

#======================================================
# Install SDK
#======================================================
SDK_PATH="$(pwd)/android_sdk/cmdline-tools"
SDK_INSTALL_SCRIPTS="$(pwd)/scripts/install_sdk.sh"

if [ ! -d "${SDK_PATH}" ] ; then
    echo "[INFO] Installing Android SDK..."
    source "${SDK_INSTALL_SCRIPTS}" || {
        echo "[ERROR] Something wrong while installing Android SDK!"
        exit 1
    }
fi
echo "[INFO] Android SDK is installed!"

export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"
echo "[INFO] ANDROID_HOME : ${ANDROID_HOME}"

echo "[INFO] Type y to agree sdkmanager --licenses"
$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager --licenses

#======================================================
# Install Curl for Android
#======================================================
# Check if Curl for android is built. This is import because MoJI uses curl for HTTP connection.

CURL_PATH="$(pwd)/curl/curl_output"

if [ ! -d "$CURL_PATH" ] ; then
    echo "[INFO] Installing Curl for Android ..."
    cd "${CURL_PATH%/*}" ; ./build.sh NDK_VERSION || {
        echo "[ERROR] Something wrong while installing curl for android!"
        exit 1
    }
fi
echo "[INFO] Curl for android is installed!"

#======================================================
# Build MoJI Application
#======================================================
echo "**********************************************************************"
echo "[INFO] Building MoJI Application..."


cd android ; ./gradlew clean

echo "[INFO] watchman version : $(watchman --version)" || {
    echo "[ERROR] Please install watchman!"
    exit 1
}

npx react-native run-android
echo "**********************************************************************"
