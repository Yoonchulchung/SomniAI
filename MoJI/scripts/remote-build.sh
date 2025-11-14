#!/bin/bash

# ====================================================================
# MoJI Remote Build Script
# ====================================================================
# This script pushes code to a remote server, builds the Android APK,
# and downloads it back to your local machine.
#
# Usage:
#   ./scripts/remote-build.sh [options]
#
# Options:
#   --config FILE    Use custom config file (default: remote-build.config)
#   --clean          Perform clean build
#   --debug          Build debug APK (default)
#   --release        Build release APK
#   --help           Show this help message
# ====================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
CONFIG_FILE="remote-build.config"
BUILD_TYPE="debug"
CLEAN_BUILD=false
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --config)
      CONFIG_FILE="$2"
      shift 2
      ;;
    --clean)
      CLEAN_BUILD=true
      shift
      ;;
    --debug)
      BUILD_TYPE="debug"
      shift
      ;;
    --release)
      BUILD_TYPE="release"
      shift
      ;;
    --help)
      head -n 20 "$0" | tail -n +3
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

# Load configuration
CONFIG_PATH="$SCRIPT_DIR/$CONFIG_FILE"
if [[ ! -f "$CONFIG_PATH" ]]; then
  echo -e "${RED}Error: Config file not found: $CONFIG_PATH${NC}"
  echo -e "${YELLOW}Please create it from the example:${NC}"
  echo -e "  cp $SCRIPT_DIR/remote-build.config.example $CONFIG_PATH"
  echo -e "  # Edit with your server details"
  exit 1
fi

echo -e "${BLUE}Loading configuration from: $CONFIG_PATH${NC}"
source "$CONFIG_PATH"

# Validate required config variables
if [[ -z "$SERVER_HOST" ]] || [[ -z "$SERVER_USER" ]] || [[ -z "$SERVER_PROJECT_PATH" ]]; then
  echo -e "${RED}Error: Missing required configuration${NC}"
  echo -e "Required variables: SERVER_HOST, SERVER_USER, SERVER_PROJECT_PATH"
  exit 1
fi

# Set defaults for optional variables
SERVER_PORT="${SERVER_PORT:-22}"
LOCAL_OUTPUT_DIR="${LOCAL_OUTPUT_DIR:-$PROJECT_ROOT/build-output}"
USE_GIT_SYNC="${USE_GIT_SYNC:-true}"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}MoJI Remote Build${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "Server:       ${BLUE}$SERVER_USER@$SERVER_HOST:$SERVER_PORT${NC}"
echo -e "Build Type:   ${BLUE}$BUILD_TYPE${NC}"
echo -e "Clean Build:  ${BLUE}$CLEAN_BUILD${NC}"
echo -e "Remote Path:  ${BLUE}$SERVER_PROJECT_PATH${NC}"
echo -e "Output Dir:   ${BLUE}$LOCAL_OUTPUT_DIR${NC}"
echo -e "${GREEN}========================================${NC}\n"

# Step 1: Sync code to server
echo -e "${YELLOW}[1/5] Syncing code to server...${NC}"

if [[ "$USE_GIT_SYNC" == "true" ]]; then
  echo -e "${BLUE}Using Git sync${NC}"

  # Check if there are uncommitted changes
  if [[ -n $(git status --porcelain) ]]; then
    echo -e "${YELLOW}Warning: You have uncommitted changes${NC}"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      exit 1
    fi
  fi

  # Push to remote
  CURRENT_BRANCH=$(git branch --show-current)
  echo -e "${BLUE}Pushing branch: $CURRENT_BRANCH${NC}"
  git push origin "$CURRENT_BRANCH"

  # Pull on server
  echo -e "${BLUE}Pulling on server...${NC}"
  ssh -p "$SERVER_PORT" "$SERVER_USER@$SERVER_HOST" "cd $SERVER_PROJECT_PATH && git fetch && git checkout $CURRENT_BRANCH && git pull origin $CURRENT_BRANCH"
else
  echo -e "${BLUE}Using rsync${NC}"

  # Use rsync to sync code
  rsync -avz --progress \
    --exclude 'node_modules' \
    --exclude 'android/app/build' \
    --exclude 'android/.gradle' \
    --exclude 'build-output' \
    --exclude '.git' \
    -e "ssh -p $SERVER_PORT" \
    "$PROJECT_ROOT/" \
    "$SERVER_USER@$SERVER_HOST:$SERVER_PROJECT_PATH/"
fi

echo -e "${GREEN}✓ Code synced successfully${NC}\n"

# Step 2: Upload build script if it doesn't exist on server
echo -e "${YELLOW}[2/5] Ensuring build script is on server...${NC}"
scp -P "$SERVER_PORT" \
  "$SCRIPT_DIR/remote-build-server.sh" \
  "$SERVER_USER@$SERVER_HOST:$SERVER_PROJECT_PATH/scripts/"

ssh -p "$SERVER_PORT" "$SERVER_USER@$SERVER_HOST" \
  "chmod +x $SERVER_PROJECT_PATH/scripts/remote-build-server.sh"

echo -e "${GREEN}✓ Build script ready${NC}\n"

# Step 3: Run build on server
echo -e "${YELLOW}[3/5] Building on server...${NC}"

BUILD_ARGS=""
if [[ "$CLEAN_BUILD" == "true" ]]; then
  BUILD_ARGS="$BUILD_ARGS --clean"
fi
if [[ "$BUILD_TYPE" == "release" ]]; then
  BUILD_ARGS="$BUILD_ARGS --release"
fi

echo -e "${BLUE}Running: ./scripts/remote-build-server.sh $BUILD_ARGS${NC}"

ssh -p "$SERVER_PORT" "$SERVER_USER@$SERVER_HOST" \
  "cd $SERVER_PROJECT_PATH && ./scripts/remote-build-server.sh $BUILD_ARGS" \
  || { echo -e "${RED}✗ Build failed on server${NC}"; exit 1; }

echo -e "${GREEN}✓ Build completed successfully${NC}\n"

# Step 4: Download APK
echo -e "${YELLOW}[4/5] Downloading APK...${NC}"

mkdir -p "$LOCAL_OUTPUT_DIR"

if [[ "$BUILD_TYPE" == "release" ]]; then
  APK_PATH="android/app/build/outputs/apk/release/app-release.apk"
  APK_NAME="MoJI-release.apk"
else
  APK_PATH="android/app/build/outputs/apk/debug/app-debug.apk"
  APK_NAME="MoJI-debug.apk"
fi

# Add timestamp to filename
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
OUTPUT_APK="$LOCAL_OUTPUT_DIR/${APK_NAME%.apk}-$TIMESTAMP.apk"

scp -P "$SERVER_PORT" \
  "$SERVER_USER@$SERVER_HOST:$SERVER_PROJECT_PATH/$APK_PATH" \
  "$OUTPUT_APK" \
  || { echo -e "${RED}✗ Failed to download APK${NC}"; exit 1; }

# Create a symlink to the latest APK
ln -sf "$OUTPUT_APK" "$LOCAL_OUTPUT_DIR/MoJI-latest-$BUILD_TYPE.apk"

echo -e "${GREEN}✓ APK downloaded successfully${NC}"
echo -e "${BLUE}Location: $OUTPUT_APK${NC}\n"

# Step 5: Show APK info
echo -e "${YELLOW}[5/5] APK Information:${NC}"
APK_SIZE=$(ls -lh "$OUTPUT_APK" | awk '{print $5}')
echo -e "Size:     ${BLUE}$APK_SIZE${NC}"
echo -e "Path:     ${BLUE}$OUTPUT_APK${NC}"
echo -e "Latest:   ${BLUE}$LOCAL_OUTPUT_DIR/MoJI-latest-$BUILD_TYPE.apk${NC}"

# Optional: Get APK details if aapt is available
if command -v aapt &> /dev/null; then
  echo -e "\n${BLUE}APK Details:${NC}"
  aapt dump badging "$OUTPUT_APK" | grep -E "package:|sdkVersion:|targetSdkVersion:" | head -3
fi

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}✓ Remote build completed successfully!${NC}"
echo -e "${GREEN}========================================${NC}"

# Optional: Ask to install on connected device
if command -v adb &> /dev/null; then
  DEVICES=$(adb devices | grep -v "List" | grep "device$" | wc -l)
  if [[ $DEVICES -gt 0 ]]; then
    echo -e "\n${YELLOW}Found $DEVICES connected Android device(s)${NC}"
    read -p "Install APK now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      echo -e "${BLUE}Installing APK...${NC}"
      adb install -r "$OUTPUT_APK"
      echo -e "${GREEN}✓ APK installed${NC}"
    fi
  fi
fi

echo -e "\n${BLUE}Done!${NC}"
