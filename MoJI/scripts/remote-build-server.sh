#!/bin/bash

# ====================================================================
# MoJI Remote Build Server Script
# ====================================================================
# This script runs on the remote server to build the Android APK.
# It is automatically uploaded and executed by remote-build.sh
#
# Usage:
#   ./scripts/remote-build-server.sh [--clean] [--release]
# ====================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
CLEAN_BUILD=false
BUILD_TYPE="debug"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --clean)
      CLEAN_BUILD=true
      shift
      ;;
    --release)
      BUILD_TYPE="release"
      shift
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}MoJI Server Build${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "Project:      ${BLUE}$PROJECT_ROOT${NC}"
echo -e "Build Type:   ${BLUE}$BUILD_TYPE${NC}"
echo -e "Clean Build:  ${BLUE}$CLEAN_BUILD${NC}"
echo -e "Node:         ${BLUE}$(node --version 2>/dev/null || echo 'not found')${NC}"
echo -e "Java:         ${BLUE}$(java -version 2>&1 | head -1 || echo 'not found')${NC}"
echo -e "${GREEN}========================================${NC}\n"

cd "$PROJECT_ROOT"

# Step 0: Setup Android SDK
echo -e "${YELLOW}[0/5] Configuring Android SDK...${NC}"

# Try to detect Android SDK location
ANDROID_SDK_ROOT=""

# Check environment variables first
if [[ -n "$ANDROID_HOME" ]]; then
  ANDROID_SDK_ROOT="$ANDROID_HOME"
  echo -e "${BLUE}Using ANDROID_HOME: $ANDROID_SDK_ROOT${NC}"
elif [[ -n "$ANDROID_SDK_ROOT" ]]; then
  # Already set
  echo -e "${BLUE}Using ANDROID_SDK_ROOT: $ANDROID_SDK_ROOT${NC}"
else
  # Try common locations
  COMMON_SDK_PATHS=(
    "$HOME/Android/Sdk"
    "$HOME/Library/Android/sdk"
    "/usr/local/android-sdk"
    "/opt/android-sdk"
  )

  for SDK_PATH in "${COMMON_SDK_PATHS[@]}"; do
    if [[ -d "$SDK_PATH" ]]; then
      ANDROID_SDK_ROOT="$SDK_PATH"
      echo -e "${BLUE}Auto-detected Android SDK: $ANDROID_SDK_ROOT${NC}"
      break
    fi
  done
fi

# Verify SDK was found
if [[ -z "$ANDROID_SDK_ROOT" ]]; then
  echo -e "${RED}✗ Android SDK not found!${NC}"
  echo -e "${RED}Please set ANDROID_HOME environment variable or install Android SDK${NC}"
  echo -e "${YELLOW}Common locations:${NC}"
  echo -e "  - ${BLUE}\$HOME/Android/Sdk${NC}"
  echo -e "  - ${BLUE}\$HOME/Library/Android/sdk${NC} (macOS)"
  echo -e "  - ${BLUE}/usr/local/android-sdk${NC}"
  echo -e "\n${YELLOW}To fix this:${NC}"
  echo -e "  ${BLUE}export ANDROID_HOME=<path-to-your-android-sdk>${NC}"
  echo -e "  ${BLUE}export ANDROID_SDK_ROOT=\$ANDROID_HOME${NC}"
  exit 1
fi

# Verify SDK is valid
if [[ ! -d "$ANDROID_SDK_ROOT/platforms" ]]; then
  echo -e "${RED}✗ Invalid Android SDK directory: $ANDROID_SDK_ROOT${NC}"
  echo -e "${RED}SDK directory must contain 'platforms' folder${NC}"
  exit 1
fi

# Create or update local.properties
LOCAL_PROPS_FILE="android/local.properties"
if [[ -f "$LOCAL_PROPS_FILE" ]]; then
  echo -e "${BLUE}Updating existing local.properties${NC}"
  # Remove old sdk.dir line if exists
  sed -i.bak '/^sdk\.dir=/d' "$LOCAL_PROPS_FILE"
fi

echo "sdk.dir=$ANDROID_SDK_ROOT" >> "$LOCAL_PROPS_FILE"
echo -e "${GREEN}✓ Created/updated local.properties with SDK path${NC}"

# Export for child processes
export ANDROID_HOME="$ANDROID_SDK_ROOT"
export ANDROID_SDK_ROOT="$ANDROID_SDK_ROOT"

echo -e "${GREEN}✓ Android SDK configured${NC}\n"

# Step 1: Install Node dependencies
echo -e "${YELLOW}[1/5] Installing Node dependencies...${NC}"
if [[ ! -d "node_modules" ]] || [[ "$CLEAN_BUILD" == "true" ]]; then
  echo -e "${BLUE}Running: npm install${NC}"
  npm install
else
  echo -e "${BLUE}node_modules exists, skipping npm install${NC}"
fi
echo -e "${GREEN}✓ Dependencies ready${NC}\n"

# Step 2: Clean build if requested
if [[ "$CLEAN_BUILD" == "true" ]]; then
  echo -e "${YELLOW}[2/5] Cleaning previous build...${NC}"

  cd android

  echo -e "${BLUE}Running: ./gradlew clean${NC}"
  ./gradlew clean || true

  # Remove build directories
  rm -rf app/build
  rm -rf .gradle
  rm -rf build

  cd ..

  echo -e "${GREEN}✓ Clean completed${NC}\n"
else
  echo -e "${YELLOW}[2/5] Skipping clean (incremental build)${NC}\n"
fi

# Step 3: Build Android APK
echo -e "${YELLOW}[3/5] Building Android APK...${NC}"

cd android

if [[ "$BUILD_TYPE" == "release" ]]; then
  echo -e "${BLUE}Running: ./gradlew assembleRelease${NC}"
  ./gradlew assembleRelease
  APK_PATH="app/build/outputs/apk/release/app-release.apk"
else
  echo -e "${BLUE}Running: ./gradlew assembleDebug${NC}"
  ./gradlew assembleDebug
  APK_PATH="app/build/outputs/apk/debug/app-debug.apk"
fi

cd ..

echo -e "${GREEN}✓ Build completed${NC}\n"

# Step 4: Verify APK
echo -e "${YELLOW}[4/5] Verifying APK...${NC}"

FULL_APK_PATH="$PROJECT_ROOT/MoJI/android/$APK_PATH"

if [[ ! -f "$FULL_APK_PATH" ]]; then
  echo -e "${RED}✗ APK not found: $FULL_APK_PATH${NC}"
  exit 1
fi

APK_SIZE=$(ls -lh "$FULL_APK_PATH" | awk '{print $5}')
echo -e "${GREEN}✓ APK verified${NC}"
echo -e "Path: ${BLUE}$APK_PATH${NC}"
echo -e "Size: ${BLUE}$APK_SIZE${NC}\n"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✓ Build completed successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
