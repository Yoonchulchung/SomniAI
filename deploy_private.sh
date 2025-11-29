#!/bin/bash
set -e

APP_NAME="python-ai"
ENV_NAME="SomniAI"
MINICONDA_DIR="$HOME/miniconda3"

echo "Python AI 서버 배포 시작..."

if [ ! -d "$MINICONDA_DIR" ]; then
    echo "Miniconda가 없습니다. 설치를 시작합니다..."
    wget https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh -O miniconda.sh
    bash miniconda.sh -b -p $MINICONDA_DIR
    rm miniconda.sh
    echo "Miniconda 설치 완료"
else
    echo "Miniconda가 이미 설치되어 있습니다."
fi

export PATH="$MINICONDA_DIR/bin:$PATH"
CONDA_PYTHON="$MINICONDA_DIR/envs/$ENV_NAME/bin/python"
CONDA_PIP="$MINICONDA_DIR/envs/$ENV_NAME/bin/pip"

if [ ! -f "$CONDA_PYTHON" ]; then
    echo "가상환경 '$ENV_NAME' 생성 중..."
    conda create -n $ENV_NAME python=3.10 -y
else
    echo "가상환경 '$ENV_NAME'이 이미 존재합니다."
fi

echo "패키지 설치 중..."
cd ./app/private_BE

$CONDA_PIP install -r requirements.txt

echo "PM2로 서버 실행 중..."

pm2 delete $APP_NAME 2>/dev/null || true

pm2 start main.py \
  --name $APP_NAME \
  --interpreter $CONDA_PYTHON \
  -- config/deploy.yaml

echo "Python 서버 배포 완료!"
pm2 save
pm2 list