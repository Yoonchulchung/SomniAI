#!/bin/bash

set -euo pipefail

MOJI_ROOT="$(pwd)"

case "$(uname)" in
    Linux*)
        export OS_NAME="linux"
        export ANDROID_HOME="$HOME/Android/Sdk"
        ;;

    Darwin*)
        export OS_NAME="darwin"
        export ANDROID_HOME="$HOME/Library/Android/sdk"
        ;;

    CYGWIN*|MINGW*|MSYS*)
        export OS_NAME="windows"
        export ANDROID_HOME="/c/Users/$USERNAME/AppData/Local/Android/Sdk"
        ;;
esac

export ANDROID_SDK_ROOT="${ANDROID_HOME}"

echo "OS : ${OS_NAME}"

# Before Install, NDK and SDK should be ready to use!

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

NDK_SDK_INSTALL_ROOT="${MOJI_ROOT}/scripts"
NDK_INSTALL_SCRIPTS="${MOJI_ROOT}/scripts/install_ndk.sh"
export ANDROID_NDK_ROOT="${ANDROID_SDK_ROOT}/ndk/${NDK_VERSION}"
NDK_INSTALL_PATH="${ANDROID_SDK_ROOT}/ndk/download"

echo "[INFO] Install NDK Version : ${NDK_VERSION}"

if [ ! -d "$ANDROID_NDK_ROOT" ] ; then
    mkdir -p "${NDK_INSTALL_PATH}"
    cd ${NDK_SDK_INSTALL_ROOT} && source "$NDK_INSTALL_SCRIPTS" "$NDK_VERSION" "$NDK_INSTALL_PATH" || {
        echo "[ERROR] Something Wrong while installing NDK"
        rm -rf "${NDK_INSTALL_PATH}"
        exit 1
    }
fi

#======================================================
# Install SDK
#======================================================
SDK_PATH="${ANDROID_SDK_ROOT}/cmdline-tools"
SDK_INSTALL_SCRIPTS="${MOJI_ROOT}/scripts/install_sdk.sh"

if [ ! -d "${SDK_PATH}" ] ; then
    echo "[INFO] Installing Android SDK..."
    cd "${NDK_SDK_INSTALL_ROOT}" && source "${SDK_INSTALL_SCRIPTS}" || {
        echo "[ERROR] Something wrong while installing Android SDK!"
        exit 1
    }
fi
echo "[INFO] Android SDK is installed!"

SDKMANAGER="$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager"

if [ ! -x "$SDKMANAGER" ]; then
  echo "[ERROR] sdkmanager not found at: $SDKMANAGER"
  echo "        Check cmdline-tools/latest is correctly placed."
  exit 1
fi

export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"
echo "[INFO] ANDROID_HOME : ${ANDROID_HOME}"

# Below command makes failure. Don't know why...
# yes | $ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager --licenses
echo "[INFO] Accepting licenses..."
"$SDKMANAGER" --licenses --sdk_root="$ANDROID_HOME" <<'EOF'
y
y
y
y
y
y
y
y
y
y
y
y
y
y
y
y
y
y
y
y
EOF

"$SDKMANAGER" --sdk_root="$ANDROID_HOME" \
  "cmake;3.22.1" "platform-tools" "platforms;android-34" "build-tools;34.0.0"

#======================================================
# Check SDK Path
#======================================================
# Required such path
# android_sdk/
#   ├──cmdline-tools/
#   │   ├──latest/
#   │       ├──bin/sdkmanager
#   ├─ndk/
REQUIRED_PATHS=(
  "$ANDROID_SDK_ROOT/cmdline-tools/latest/bin/sdkmanager"
  "$ANDROID_SDK_ROOT/ndk"
)
echo "[INFO] Checking files..."
for path in "${REQUIRED_PATHS[@]}"; do
    if [ -e "$path" ]; then
        echo "[OK] Found: $path"
    else
        echo "[ERROR] Missing: $path"
        exit 1
    fi
done

echo "[INFO] Android SDK directory structure is valid!"

#======================================================
# Install Curl and OpenSSL for Android
#======================================================
# Check if Curl for android is built. This is import because MoJI uses curl for HTTP connection.

export CURL_ANDROID_ROOT="${MOJI_ROOT}/curl/curl-for-android"
export OPENSSL_ANDROID_ROOT="${MOJI_ROOT}/curl/openssl-for-android"
if [ ! -d "$CURL_ANDROID_ROOT" ] || [ ! -d "$OPENSSL_ANDROID_ROOT" ]; then
    echo "[INFO] Installing curl and OpenSSL for Android ..."
    echo "$OPENSSL_ANDROID_ROOT"
    cd "${MOJI_ROOT}/curl" ; ./build.sh "${NDK_VERSION}" || {
        echo "[ERROR] Something wrong while installing curl for android!"
        exit 1
    }
fi
echo "[INFO] Curl and OpenSSL for android is installed!"

#======================================================
# Build MoJI Application
#======================================================
JAVA_VERSION_OUTPUT=$(java -version 2>&1 | head -n 1)
JAVA_VERSION=$(echo "$JAVA_VERSION_OUTPUT" | sed -E 's/.*"([0-9]+).*/\1/')
if [ "$JAVA_VERSION" -ne 17 ]; then
    echo "[ERROR] Java 17 is required, but found $JAVA_VERSION"
    exit 1
fi
echo "[INFO] Java version is OK ($JAVA_VERSION)"

NODE_VERSION=$(node -v || echo "0")
NPM_VERSION=$(npm -v || echo "0")

echo "[INFO] Node version : $NODE_VERSION"
echo "[INFO] NPM version  : $NPM_VERSION"

REQUIRED_NODE_MAJOR=20
NODE_MAJOR=$(echo "$NODE_VERSION" | sed -E 's/v([0-9]+).*/\1/')
if [ "$NODE_MAJOR" -lt "$REQUIRED_NODE_MAJOR" ]; then
    echo "[ERROR] Node.js $REQUIRED_NODE_MAJOR or higher is required!"
    exit 1
fi

echo "**********************************************************************"
echo "[INFO] Building MoJI Application..."

if ! command -v watchman &>/dev/null; then
    echo "[ERROR] watchman not installed!"
    if [ "$OS_NAME" = "darwin" ]; then
        echo "    Try: brew install watchman"
    elif [ "$OS_NAME" = "linux" ]; then
        echo "    Try: sudo apt-get install watchman"
    fi
    exit 1
fi

echo "[INFO] Installing npm... "
npm install && {
    echo "[INFO] Completed installing modules!"
}

if [ ! -d "${MOJI_ROOT}/android" ] ; then
    ls
    echo "[ERROR] wrong path!"
    exit 1
fi

cd "${MOJI_ROOT}"/android && ./gradlew clean && ./gradlew build

echo "**********************************************************************"