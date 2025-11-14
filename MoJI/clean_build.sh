#!/bin/bash
clear
echo "Clean building MoJI Application..."
MOJI_ROOT="$(pwd)"

# Detect OS
case "$(uname)" in
    Linux*) OS_NAME="linux" ;;
    Darwin*) OS_NAME="darwin" ;;
    *) OS_NAME="unknown" ;;
esac

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
        if [ "$OS_NAME" = "darwin" ]; then
            echo "Install with: brew install openjdk@17"
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
