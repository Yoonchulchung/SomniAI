# 🚀 MoJI Remote Build Scripts

서버에서 Android APK를 빌드하고 로컬로 다운로드하는 스크립트입니다.

## 📋 목차

- [왜 사용하나요?](#왜-사용하나요)
- [준비사항](#준비사항)
- [설정 방법](#설정-방법)
- [사용 방법](#사용-방법)
- [문제 해결](#문제-해결)

## 🎯 왜 사용하나요?

- **빠른 빌드**: 강력한 서버에서 빌드하여 시간 절약
- **리소스 절약**: 로컬 머신의 CPU/메모리 부담 감소
- **일관된 환경**: 서버의 고정된 빌드 환경 사용
- **배터리 절약**: 노트북에서 빌드하는 경우 배터리 소모 감소

## ✅ 준비사항

### 로컬 머신

```bash
# SSH 클라이언트 (보통 설치되어 있음)
ssh -V

# Git (Git 동기화 사용 시)
git --version

# rsync (rsync 동기화 사용 시)
rsync --version
```

### 서버

```bash
# SSH 서버
# Node.js
node --version  # v16 이상 권장

# Java Development Kit
java -version   # JDK 11 or 17

# Android SDK & NDK
# (이미 설정되어 있어야 함)

# Git (Git 동기화 사용 시)
git --version
```

## ⚙️ 설정 방법

### 1. 설정 파일 생성

```bash
cd MoJI/scripts
cp remote-build.config.example remote-build.config
```

### 2. 설정 파일 편집

```bash
nano remote-build.config
```

**필수 설정:**
```bash
SERVER_HOST="192.168.1.100"              # 서버 IP 또는 도메인
SERVER_USER="myusername"                 # SSH 사용자명
SERVER_PROJECT_PATH="/home/myusername/SomniAI"  # 서버의 프로젝트 경로
```

**선택 설정:**
```bash
SERVER_PORT=22                           # SSH 포트 (기본: 22)
LOCAL_OUTPUT_DIR="./build-output"        # 로컬 출력 디렉토리
USE_GIT_SYNC="true"                      # Git 사용 (false면 rsync)
```

### 3. SSH 키 설정 (권장)

비밀번호 입력 없이 빌드하려면 SSH 키를 설정하세요:

```bash
# SSH 키 생성 (없는 경우)
ssh-keygen -t ed25519 -C "your_email@example.com"

# 서버에 공개 키 복사
ssh-copy-id -p 22 username@your-server.com

# 테스트
ssh username@your-server.com "echo 'SSH works!'"
```

### 4. 서버에 프로젝트 준비

**Git 사용 시:**
```bash
# 서버에 SSH 접속
ssh username@your-server.com

# 프로젝트 클론
cd ~
git clone https://github.com/Yoonchulchung/SomniAI.git
cd SomniAI

# Node 모듈 설치
cd MoJI
npm install
```

**rsync 사용 시:**
```bash
# 서버에 디렉토리만 생성
ssh username@your-server.com "mkdir -p /home/username/SomniAI"
# 첫 실행 시 rsync가 자동으로 파일 전송
```

## 🚀 사용 방법

### 기본 사용법

```bash
# MoJI 디렉토리에서 실행
cd MoJI

# Debug APK 빌드 (기본)
./scripts/remote-build.sh

# Release APK 빌드
./scripts/remote-build.sh --release

# Clean 빌드
./scripts/remote-build.sh --clean

# Clean Release 빌드
./scripts/remote-build.sh --clean --release
```

### 커스텀 설정 파일 사용

```bash
# 다른 서버 설정 사용
./scripts/remote-build.sh --config production-server.config --release
```

### 빌드 프로세스

스크립트는 다음 단계를 자동으로 수행합니다:

```
[1/5] 코드 동기화 (Git push/pull 또는 rsync)
[2/5] 빌드 스크립트 업로드
[3/5] 서버에서 빌드 실행
[4/5] APK 다운로드
[5/5] APK 정보 표시
```

### 출력 결과

빌드된 APK는 다음 위치에 저장됩니다:

```
MoJI/build-output/
├── MoJI-debug-20251114-143052.apk      # 타임스탬프 포함
├── MoJI-debug-20251114-145123.apk
├── MoJI-latest-debug.apk               # 최신 버전 (심볼릭 링크)
└── MoJI-latest-release.apk
```

## 💡 고급 사용법

### 1. 빌드 후 자동 설치

```bash
# ADB가 설치되어 있고 디바이스가 연결된 경우
# 스크립트가 자동으로 설치 여부를 물어봅니다
./scripts/remote-build.sh

# 또는 수동으로 설치
adb install -r build-output/MoJI-latest-debug.apk
```

### 2. 여러 서버 관리

```bash
# 개발 서버
./scripts/remote-build.sh --config dev-server.config

# 스테이징 서버
./scripts/remote-build.sh --config staging-server.config --release

# 프로덕션 서버
./scripts/remote-build.sh --config prod-server.config --release --clean
```

### 3. CI/CD 통합

```bash
# Jenkins, GitHub Actions 등에서 사용
./scripts/remote-build.sh --release --config ci-server.config

# 빌드 성공 확인
if [ $? -eq 0 ]; then
  echo "Build successful"
  # APK 업로드, 배포 등
else
  echo "Build failed"
  exit 1
fi
```

### 4. 서버에서 직접 빌드

```bash
# 서버에 SSH 접속
ssh username@your-server.com

# 프로젝트로 이동
cd SomniAI/MoJI

# 직접 빌드
./scripts/remote-build-server.sh --clean --release
```

## 🔧 문제 해결

### SSH 연결 실패

```bash
# SSH 연결 테스트
ssh -v username@your-server.com

# 포트 지정
ssh -p 2222 username@your-server.com

# SSH 키 권한 확인
chmod 700 ~/.ssh
chmod 600 ~/.ssh/id_ed25519
```

### Git 동기화 실패

```bash
# 서버에서 Git 상태 확인
ssh username@your-server.com "cd /path/to/SomniAI && git status"

# 충돌 해결
ssh username@your-server.com "cd /path/to/SomniAI && git reset --hard origin/main"

# 또는 rsync 사용
# remote-build.config에서 USE_GIT_SYNC="false"
```

### 빌드 실패

```bash
# 서버에서 로그 확인
ssh username@your-server.com "cd /path/to/SomniAI/MoJI && cat android/app/build/outputs/logs/build.log"

# Clean 빌드 시도
./scripts/remote-build.sh --clean

# 서버 환경 확인
ssh username@your-server.com "cd /path/to/SomniAI/MoJI && ./scripts/remote-build-server.sh"
```

### APK 다운로드 실패

```bash
# APK 경로 확인
ssh username@your-server.com "ls -la /path/to/SomniAI/MoJI/android/app/build/outputs/apk/"

# 수동 다운로드
scp username@your-server.com:/path/to/SomniAI/MoJI/android/app/build/outputs/apk/debug/app-debug.apk ./
```

### 권한 오류

```bash
# 스크립트 실행 권한 추가
chmod +x scripts/remote-build.sh
chmod +x scripts/remote-build-server.sh

# 서버에서 프로젝트 권한 확인
ssh username@your-server.com "ls -la /path/to/SomniAI"
```

## 📝 예제 시나리오

### 시나리오 1: 첫 설정 및 빌드

```bash
# 1. 설정 파일 생성
cd MoJI/scripts
cp remote-build.config.example remote-build.config
nano remote-build.config

# 2. SSH 키 설정
ssh-copy-id username@192.168.1.100

# 3. 첫 빌드 (clean)
cd ..
./scripts/remote-build.sh --clean

# 4. 빌드된 APK 설치
adb install -r build-output/MoJI-latest-debug.apk
```

### 시나리오 2: 일상적인 개발

```bash
# 1. 코드 수정
# ... 코드 변경 ...

# 2. 커밋
git add .
git commit -m "feat: new feature"

# 3. 빌드 (incremental)
./scripts/remote-build.sh

# 4. 자동 설치 프롬프트에서 'y' 입력
```

### 시나리오 3: Release 배포

```bash
# 1. Release 브랜치 체크아웃
git checkout release

# 2. 버전 업데이트
# ... android/app/build.gradle 수정 ...

# 3. Clean Release 빌드
./scripts/remote-build.sh --clean --release

# 4. APK 확인 및 배포
ls -lh build-output/MoJI-latest-release.apk
```

## 🎓 도움말

### 스크립트 옵션 보기

```bash
./scripts/remote-build.sh --help
```

### 빌드 출력 확인

빌드 중 모든 출력이 터미널에 표시됩니다:
- 🔵 파란색: 정보 메시지
- 🟢 녹색: 성공 메시지
- 🟡 노란색: 경고 및 진행 상태
- 🔴 빨간색: 에러 메시지

### 성능 최적화

**빌드 속도 향상:**
- Clean 빌드는 필요할 때만 사용
- Incremental 빌드가 훨씬 빠름
- 서버에 SSD 사용 권장
- 서버에 충분한 RAM (최소 8GB) 권장

**네트워크 최적화:**
- Git 사용이 rsync보다 빠름 (작은 변경사항의 경우)
- SSH 압축 활성화: `ssh -C`
- SSH 연결 재사용: `~/.ssh/config`에 `ControlMaster` 설정

## 📚 추가 리소스

- [Android Build Configuration](https://developer.android.com/build)
- [Gradle Build Guide](https://docs.gradle.org/current/userguide/userguide.html)
- [SSH Configuration](https://www.ssh.com/academy/ssh/config)

## 🐛 버그 리포트

문제가 발생하면 다음 정보와 함께 이슈를 등록해주세요:

```bash
# 환경 정보 수집
./scripts/remote-build.sh --debug 2>&1 | tee build-error.log

# 또는 수동으로
echo "Local Environment:" > debug-info.txt
uname -a >> debug-info.txt
ssh -V >> debug-info.txt
git --version >> debug-info.txt

echo -e "\nServer Environment:" >> debug-info.txt
ssh username@server "uname -a; node --version; java -version" >> debug-info.txt 2>&1
```

## 📄 라이센스

MIT License - SomniAI 프로젝트와 동일
