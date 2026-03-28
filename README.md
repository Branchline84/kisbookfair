# 한국소공인협회 — 어린이 책잔치 AI 캐릭터 체험 앱

태블릿에서 구동하는 AI 캐릭터 대화 + 사진 촬영 키오스크 앱입니다.

---

## 빠른 실행 (3단계)

### 1단계 — 코드 받기

```bash
git clone https://github.com/branchline84/kisbookfair.git
cd kisbookfair
git checkout claude/character-chat-app-NFcxe
npm install
```

### 2단계 — Gemini API 키 설정

1. [https://aistudio.google.com/apikey](https://aistudio.google.com/apikey) 접속
2. **"Create API Key"** 클릭 → 키 복사
3. 프로젝트 폴더 안에 `.env` 파일 만들고 아래 내용 입력:

```
GEMINI_API_KEY=여기에_키_붙여넣기
```

### 3단계 — 실행

```bash
npm run dev
```

브라우저에서 `http://localhost:3000` 접속

---

## 태블릿에서 실행

같은 Wi-Fi에 있는 PC에서 서버 실행 후, 터미널에 출력되는 **Network 주소**를 태블릿 브라우저에 입력하세요.

```
예: http://192.168.0.10:3000
```

태블릿에서 전체화면 모드로 사용하면 키오스크처럼 작동합니다.

---

## 앱 화면 흐름

```
[시작 화면]
    ↓
[캐릭터 선택] — 아라 / 갓도령 / 호백 중 1개 터치
    ↓
[AI 대화]
  - 캐릭터가 이름을 물어봄
  - "나 민준이야" → 이름 인식 후 환영 인사 + 소공인 설명
  - 마이크 버튼으로 음성 대화
    ↓
[활동 선택] — 사진 찍기 / 칠보공예 / 티셔츠 만들기
    ↓
[사진 부스] — 캐릭터와 셀카 + 브랜드 워터마크 자동 삽입 + 다운로드
```

---

## 주의사항

| 항목 | 내용 |
|------|------|
| 카메라 | 사진 부스 사용 시 브라우저에서 카메라 허용 필요 |
| 마이크 | 음성 대화 시 마이크 허용 필요 |
| HTTPS | 배포 서버에 올릴 경우 HTTPS 필수 (카메라/마이크 보안 정책) |
| API 한도 | Gemini 무료 플랜: 분당 15회 요청 (행사 규모에 충분) |

---

## 기술 스택

| 항목 | 내용 |
|------|------|
| 프레임워크 | React 19 + TypeScript |
| UI | Tailwind CSS + Framer Motion |
| AI | Google Gemini 2.0 Flash |
| TTS | Gemini TTS (한국어 음성 3종) |
| STT | Web Speech API (브라우저 내장, 무료) |
| 캐릭터 | SVG 코드 기반 애니메이션 (이미지 파일 불필요) |
