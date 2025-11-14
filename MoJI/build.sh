#!/bin/bash

set -euo pipefail

export MOJI_ROOT="$(pwd)"

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
# Check and set Java 17
echo "[INFO] Checking Java version..."

JAVA_VERSION_OUTPUT=$(java -version 2>&1 | head -n 1)
JAVA_VERSION=$(echo "$JAVA_VERSION_OUTPUT" | sed -E 's/.*"([0-9]+).*/\1/')

if [ "$JAVA_VERSION" -ne 17 ]; then
    echo "[WARN] Current Java version is $JAVA_VERSION, but Java 17 is required"
    echo "[INFO] Attempting to switch to Java 17..."

    JAVA_17_FOUND=false

    case "$OS_NAME" in
        linux)
            # Try to find Java 17 installation
            if [ -d "/usr/lib/jvm/java-17-openjdk-amd64" ]; then
                export JAVA_HOME="/usr/lib/jvm/java-17-openjdk-amd64"
                export PATH="$JAVA_HOME/bin:$PATH"
                JAVA_17_FOUND=true
                echo "[INFO] Switched to Java 17 at $JAVA_HOME"
            elif [ -d "/usr/lib/jvm/jdk-17" ]; then
                export JAVA_HOME="/usr/lib/jvm/jdk-17"
                export PATH="$JAVA_HOME/bin:$PATH"
                JAVA_17_FOUND=true
                echo "[INFO] Switched to Java 17 at $JAVA_HOME"
            elif command -v update-java-alternatives &>/dev/null; then
                # Try to switch using update-java-alternatives
                JAVA_17_PATH=$(update-java-alternatives -l 2>/dev/null | grep 'java-17' | head -1 | awk '{print $3}')
                if [ -n "$JAVA_17_PATH" ]; then
                    export JAVA_HOME="$JAVA_17_PATH"
                    export PATH="$JAVA_HOME/bin:$PATH"
                    JAVA_17_FOUND=true
                    echo "[INFO] Switched to Java 17 at $JAVA_HOME"
                fi
            fi
            ;;

        darwin)
            # macOS: Use /usr/libexec/java_home
            if /usr/libexec/java_home -v 17 &>/dev/null; then
                export JAVA_HOME=$(/usr/libexec/java_home -v 17)
                export PATH="$JAVA_HOME/bin:$PATH"
                JAVA_17_FOUND=true
                echo "[INFO] Switched to Java 17 at $JAVA_HOME"
            fi
            ;;
    esac

    if [ "$JAVA_17_FOUND" = false ]; then
        echo "[ERROR] Java 17 is not installed on this system"
        echo ""
        if [ "$OS_NAME" = "darwin" ]; then
            echo "Install with: brew install openjdk@17"
            echo "Then run: sudo ln -sfn /opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk /Library/Java/JavaVirtualMachines/openjdk-17.jdk"
        elif [ "$OS_NAME" = "linux" ]; then
            echo "Install with: sudo apt install -y openjdk-17-jdk"
        fi
        exit 1
    fi

    # Verify the switch worked
    JAVA_VERSION_OUTPUT=$(java -version 2>&1 | head -n 1)
    JAVA_VERSION=$(echo "$JAVA_VERSION_OUTPUT" | sed -E 's/.*"([0-9]+).*/\1/')

    if [ "$JAVA_VERSION" -ne 17 ]; then
        echo "[ERROR] Failed to switch to Java 17 (still using version $JAVA_VERSION)"
        exit 1
    fi
fi

echo "[INFO] Java version is OK ($JAVA_VERSION)"
echo "[INFO] JAVA_HOME: ${JAVA_HOME:-not set}"

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