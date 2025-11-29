#!/bin/bash
set -e

echo "시스템 패키지 업데이트 및 Mosquitto 설치..."
sudo apt update
sudo apt install -y mosquitto mosquitto-clients curl git

sudo bash -c 'cat <<EOF >> /etc/mosquitto/mosquitto.conf

# --- External Access Config ---
listener 1883
allow_anonymous true
EOF'

# Mosquitto 서비스 시작
sudo systemctl enable mosquitto
sudo systemctl start mosquitto

# ------------------------------------------------------------------
# NVM 및 Node.js v20 설치
# ------------------------------------------------------------------
echo "NVM 및 Node.js 설치 중..."
export NVM_DIR="$HOME/.nvm"

if [ ! -d "$NVM_DIR" ]; then
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
fi

[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"

nvm install 20
nvm use 20
nvm alias default 20

echo "Node version: $(node -v)"

# ------------------------------------------------------------------
# 글로벌 패키지 설치 (PM2, Nest CLI, pnpm)
# ------------------------------------------------------------------
echo "글로벌 도구(PM2, NestJS, pnpm) 설치 중..."

npm install -g pm2 @nestjs/cli

corepack enable
corepack prepare pnpm@latest --activate

# ------------------------------------------------------------------
# Frontend (Next.js) 배포
# ------------------------------------------------------------------
echo "Frontend (Next.js) 배포 시작..."
cd app/public_FE

pnpm install
pnpm run build

pm2 delete "next-frontend" 2>/dev/null || true
pm2 start npm --name "next-frontend" -- run start:prod

# ------------------------------------------------------------------
# Backend (NestJS) 배포
# ------------------------------------------------------------------
echo "Backend (NestJS) 배포 시작..."
cd ../public_be_nest

pnpm install
pnpm run build

pm2 delete "backend-api" 2>/dev/null || true
pm2 start dist/main.js --name "backend-api"

# ------------------------------------------------------------------
# 상태 확인 및 저장
# ------------------------------------------------------------------
echo "배포 완료! PM2 상태를 확인합니다."
pm2 save      # 재부팅 시 자동 실행 저장
pm2 list