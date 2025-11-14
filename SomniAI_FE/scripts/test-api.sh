#!/bin/bash

###############################################################################
# API Test Script
# Tests all API endpoints
###############################################################################

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

API_URL="${API_URL:-http://localhost/api}"

echo -e "${BLUE}🧪 Testing API Endpoints${NC}"
echo "API URL: $API_URL"
echo "================================"

test_endpoint() {
    local method=$1
    local path=$2
    local description=$3
    local data=$4

    echo -e "\n${BLUE}Testing: $description${NC}"
    echo "  $method $path"

    if [ -z "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X $method "$API_URL$path")
    else
        response=$(curl -s -w "\n%{http_code}" -X $method "$API_URL$path" \
            -H "Content-Type: application/json" \
            -d "$data")
    fi

    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)

    if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
        echo -e "  ${GREEN}✓ Success (HTTP $http_code)${NC}"
        echo "  Response: $body" | head -c 100
        echo ""
    else
        echo -e "  ${RED}✗ Failed (HTTP $http_code)${NC}"
        echo "  Response: $body"
    fi
}

# Health Check
test_endpoint "GET" "/health" "Health Check"

# System Status
test_endpoint "GET" "/health/status" "System Status"

# Statistics
test_endpoint "GET" "/stats" "Get Statistics"

# MQTT Status
test_endpoint "GET" "/mqtt/status" "MQTT Connection Status"

# MQTT Messages
test_endpoint "GET" "/mqtt/messages?limit=5" "Get Recent MQTT Messages"

# Publish MQTT Message
test_endpoint "POST" "/mqtt/publish" "Publish MQTT Message" \
    '{"topic":"test/somniai","message":"Hello from test script","qos":0}'

# Subscribe to MQTT Topic
test_endpoint "POST" "/mqtt/subscribe" "Subscribe to MQTT Topic" \
    '{"topic":"test/somniai"}'

# Update Statistics
test_endpoint "POST" "/stats" "Update Statistics" \
    '{"activeStreams":2,"totalFrames":5000,"connectedDevices":5}'

echo -e "\n================================"
echo -e "${GREEN}API testing complete!${NC}"
