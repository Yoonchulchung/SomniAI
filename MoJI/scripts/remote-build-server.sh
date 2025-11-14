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

cd "$PROJECT_ROOT/MoJI"

# Step 1: Install Node dependencies
echo -e "${YELLOW}[1/4] Installing Node dependencies...${NC}"
if [[ ! -d "node_modules" ]] || [[ "$CLEAN_BUILD" == "true" ]]; then
  echo -e "${BLUE}Running: npm install${NC}"
  npm install
else
  echo -e "${BLUE}node_modules exists, skipping npm install${NC}"
fi
echo -e "${GREEN}✓ Dependencies ready${NC}\n"

# Step 2: Clean build if requested
if [[ "$CLEAN_BUILD" == "true" ]]; then
  echo -e "${YELLOW}[2/4] Cleaning previous build...${NC}"

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
  echo -e "${YELLOW}[2/4] Skipping clean (incremental build)${NC}\n"
fi

# Step 3: Build Android APK
echo -e "${YELLOW}[3/4] Building Android APK...${NC}"

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
echo -e "${YELLOW}[4/4] Verifying APK...${NC}"

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
