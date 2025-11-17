#!/bin/bash

# SomniAI App Tests Runner
# 모든 테스트를 실행하는 스크립트

set -e  # 에러 발생 시 중단

echo "========================================="
echo "SomniAI App Tests Runner"
echo "========================================="
echo ""

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 결과 추적
BACKEND_RESULT=0
FRONTEND_RESULT=0

# Backend Tests
echo "${YELLOW}[1/2] Running Backend API Tests...${NC}"
echo "----------------------------------------"
cd backend

if [ ! -d "node_modules" ]; then
  echo "Installing backend test dependencies..."
  npm install
fi

if npm test; then
  echo "${GREEN}✓ Backend tests passed${NC}"
  BACKEND_RESULT=0
else
  echo "${RED}✗ Backend tests failed${NC}"
  BACKEND_RESULT=1
fi

cd ..
echo ""

# Frontend Tests
echo "${YELLOW}[2/2] Running Frontend Tests...${NC}"
echo "----------------------------------------"
cd frontend

if [ ! -d "node_modules" ]; then
  echo "Installing frontend test dependencies..."
  npm install
fi

if npm test; then
  echo "${GREEN}✓ Frontend tests passed${NC}"
  FRONTEND_RESULT=0
else
  echo "${RED}✗ Frontend tests failed${NC}"
  FRONTEND_RESULT=1
fi

cd ..
echo ""

# 최종 결과
echo "========================================="
echo "Test Results Summary"
echo "========================================="
echo ""

if [ $BACKEND_RESULT -eq 0 ]; then
  echo "${GREEN}✓ Backend Tests: PASSED${NC}"
else
  echo "${RED}✗ Backend Tests: FAILED${NC}"
fi

if [ $FRONTEND_RESULT -eq 0 ]; then
  echo "${GREEN}✓ Frontend Tests: PASSED${NC}"
else
  echo "${RED}✗ Frontend Tests: FAILED${NC}"
fi

echo ""

# 전체 결과
TOTAL_RESULT=$((BACKEND_RESULT + FRONTEND_RESULT))

if [ $TOTAL_RESULT -eq 0 ]; then
  echo "${GREEN}========================================="
  echo "All Tests Passed! ✓"
  echo "=========================================${NC}"
  exit 0
else
  echo "${RED}========================================="
  echo "Some Tests Failed! ✗"
  echo "=========================================${NC}"
  exit 1
fi
