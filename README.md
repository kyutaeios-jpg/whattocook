# 뭐해먹지? (cookable.today) — 프로젝트 문서

## 1. 서비스 개요

**한 줄 요약:** 냉장고 속 재료를 선택하면 만들 수 있는 YouTube 요리 레시피를 찾아주는 검색 엔진

**URL:** https://cookable.today
**GitHub:** https://github.com/kyutaeios-jpg/whattocook
**타겟:** 20~30대 자취 초보 학생/사회 초년생

### 핵심 포지셔닝
- YouTube를 대체하는 게 아니라, 재료 기반으로 YouTube 레시피를 **발견**하게 해주는 도구
- 조리 과정은 YouTube 원본 영상으로 유도
- 부족한 재료는 쿠팡/네이버 쇼핑 구매 링크 제공 (쿠팡 파트너스 수익)

---

## 2. 아키텍처

```
[사용자] → cookable.today (Express 서빙)
              │
              ├── 정적 파일 (React 빌드)
              ├── /api/* (REST API)
              ├── /recipe/:id (SSR 메타태그)
              └── /sitemap.xml (동적 생성)
              │
              ├── Claude API (레시피 추출, 재료 분류)
              ├── YouTube Data API v3 (영상 목록, 설명란)
              └── PostgreSQL (Railway)
```

| 계층 | 기술 | 배포 |
|---|---|---|
| Frontend | Vite + React + react-router-dom | Railway (Express에서 서빙) |
| Backend | Express + @anthropic-ai/sdk + pg | Railway |
| DB | PostgreSQL | Railway 플러그인 |
| 도메인 | cookable.today | Cloudflare DNS → Railway |

---

## 3. 주요 기능

### 3.1 서비스 페이지 (/)

**재료 선택 뷰:**
- 3단계 아코디언: 카테고리 → 서브카테고리 → 개별 재료
- 10회 이상 등장하는 재료만 아코디언에 표시 (161개)
- 나머지 633개는 검색으로만 접근 가능
- 선택한 재료는 localStorage에 저장 (브라우저 닫아도 유지)
- 하단 플로팅 CTA: "만들 수 있는 레시피 보기 (N개 매칭)"

**레시피 리스트 뷰:**
- 복합 점수 정렬: 내 재료 포함 비율(60%) + 일치율(40%)
- 카드에 재료 준비율(%) + 내 재료 일치 수(N/M) 표시
- 재료 미선택 시 랜덤 셔플

**레시피 상세 패널:**
- YouTube 임베드
- 재료 리스트 (분량 포함, 보유/미보유 구분)
- 조리 순서
- 부족한 재료 → 쿠팡/네이버 쇼핑 구매 링크
- 공유 버튼 (Web Share API / 클립보드 복사)

**레시피 비교:**
- 2개 선택 → Jaccard 유사도 + 공통/고유 재료

### 3.2 개별 레시피 페이지 (/recipe/:id)

- SEO 최적화 (서버사이드 메타태그, JSON-LD Recipe Schema)
- YouTube 임베드, 재료, 조리 순서
- 재료 구매 링크 (쿠팡/네이버 그리드)
- 공유 버튼
- 구글 검색 결과에 리치 결과로 표시

### 3.3 어드민 페이지 (/admin)

**접근 제어:** 비밀번호 게이트 (sessionStorage로 세션 유지)

**대시보드:**
- 레시피 수 / 재료 수 / 카테고리 분포

**레시피 추가 (큐 기반):**
- textarea에 URL 여러 줄 입력 (영상/채널/재생목록 혼합 가능)
- 자동 감지: @채널명, /channel/, /c/, list= 파라미터
- 순차 처리 + 2초마다 폴링으로 진행 상황 표시
- 중복 자동 스킵, 재료 없는 영상 스킵, 30초 타임아웃
- 중지 버튼 (서버 즉시 중단)

**레시피 목록:**
- 수정 (인라인 편집) / 삭제

**재료 관리:**
- 카테고리 탭: 재료명, 레시피 수, 카테고리, 서브카테고리 편집
- 동의어 탭: 수동 추가/편집/삭제, AI 자동 감지, 저장 시 소급 적용

**DB 초기화:**
- 2단 확인 후 전체 삭제

### 3.4 온보딩
- 첫 방문 시 팝업: 3단계 안내 (재료 고르기 → 레시피 확인 → 영상 보며 요리)
- "다시 보지 않기" → localStorage 영구 숨김

---

## 4. 데이터 처리 파이프라인

### 4.1 레시피 추출 흐름

```
YouTube URL 입력
  ↓
YouTube Data API → 설명란(description) 가져오기
  ↓
재료 키워드 사전 체크 (재료, 분량, 큰술, g, ml 등)
  ├─ 없음 → skip
  ↓
Claude API → 설명란을 JSON으로 구조화
  ├─ 요리 영상 아님 → skip
  ├─ 재료 명시 안 됨 → skip
  ↓
동의어 적용 (DB 수동 등록분만)
  ↓
유효하지 않은 재료 필터링 ({}, null 등)
  ↓
PostgreSQL 저장
```

**프롬프트 핵심 지시:**
- "설명란에 적힌 재료명을 정확히 그대로 사용해. 절대 다른 이름으로 바꾸거나 추측하지 마."
- "설명란에 없는 재료를 추가하지 마."

### 4.2 재료 카테고리 분류

**11개 카테고리:** 육류, 해산물, 채소, 과일, 견과류, 양념/소스, 곡물/면/두부, 유제품/계란, 액체/육수, 가공식품, 기타

**서브카테고리:** 마트 매대 기준 중분류 (돼지고기, 소고기, 잎채소, 간장류, 면류 등)

**분류 방식:**
- Claude API로 배치 분류 (어드민에서 실행)
- DB에 캐시 → 서비스 페이지에서는 Claude 호출 없이 캐시만 반환
- 어드민에서 수동 수정 가능

### 4.3 동의어 처리

**범위:** 오타/띄어쓰기/외래어 표기/업장 용어만 (가공 형태 차이는 서브카테고리로 해결)

**자동 감지:** Claude API로 후보 생성 → 어드민에서 검수/수정 → 승인
**체인 플래튼:** A→B→C를 A→C로 자동 변환
**소급 적용:** 저장 시 기존 레시피 재료명 일괄 업데이트 (비동기)

---

## 5. 수익 모델

### 쿠팡 파트너스
- 코드: `AF8567820`
- 적용 위치: 상세 패널 부족 재료, 개별 레시피 페이지 재료 구매
- URL 형식: `https://www.coupang.com/np/search?q={재료명}&lptag=AF8567820&pageType=SEARCH&pageValue={재료명}`
- 사용자가 링크 경유 구매 시 수수료 발생

### 네이버 쇼핑
- 수익 없음 (대체 옵션)
- URL: `https://shopping.naver.com/ns/search?query={재료명}&searchMethod=direct`

---

## 6. SEO

| 항목 | 구현 |
|---|---|
| robots.txt | /admin 차단, sitemap 경로 명시 |
| sitemap.xml | 서버에서 동적 생성 (전체 레시피 URL) |
| 개별 레시피 URL | /recipe/:id |
| 서버사이드 메타태그 | title, description, OG, Twitter Card 동적 삽입 |
| JSON-LD | Recipe Schema (name, author, ingredients, instructions, video) |
| canonical URL | 각 레시피별 |
| Google Search Console | 등록 + sitemap 제출 완료 |
| 네이버 서치어드바이저 | 등록 완료 |

---

## 7. PWA

- manifest.json (standalone, portrait)
- 아이콘: 512x512, 192x192, 180x180(apple-touch-icon), favicon
- 디자인: #FF7043→#D84315 그라디언트 + 프라이팬 아이콘
- theme-color: #f97316

---

## 8. 기술 스택

### Frontend
- Vite + React 18
- react-router-dom (/, /recipe/:id, /admin)
- 상태 관리: useState/useEffect (라이브러리 없음)
- 저장: localStorage (선택 재료, 온보딩)
- 폰트: Noto Serif KR + Pretendard + DM Mono

### Backend
- Express 5
- @anthropic-ai/sdk (Claude Sonnet 4.6)
- pg (PostgreSQL)
- youtube-transcript (미사용, 설명란 방식으로 전환)
- 프론트엔드 빌드 결과물을 Express에서 static 서빙

### DB 테이블

| 테이블 | 용도 |
|---|---|
| recipes | 레시피 (title, channel, category, ingredients JSONB, steps JSONB, youtube_id) |
| ingredient_categories | 재료 카테고리 + 서브카테고리 캐시 |
| ingredient_synonyms | 동의어 매핑 (alias → canonical) |

### 외부 API

| API | 용도 | 비용 |
|---|---|---|
| Claude API (Sonnet) | 레시피 구조화, 재료 분류, 동의어 감지 | ~$0.01/영상 |
| YouTube Data API v3 | 영상 메타/설명란, 채널 목록 | 무료 (10,000 유닛/일) |

---

## 9. 환경 변수

### Backend (.env)
```
ANTHROPIC_API_KEY=sk-ant-...
YOUTUBE_API_KEY=AIza...
DATABASE_URL=postgresql://...
ALLOWED_ORIGIN=http://localhost:5173
PORT=3001
```

### Frontend (.env.local)
```
VITE_API_URL=http://localhost:3001
VITE_ADMIN_PASSWORD=****
```

### Railway
- ANTHROPIC_API_KEY
- YOUTUBE_API_KEY
- DATABASE_URL (내부: postgres.railway.internal, 외부: hopper.proxy.rlwy.net)
- NODE_ENV=production

---

## 10. 배포 프로세스

```bash
# 1. 프론트 빌드
cd frontend && VITE_API_URL="" VITE_ADMIN_PASSWORD=**** npx vite build

# 2. 백엔드 public에 복사
rm -rf ../backend/public && cp -r dist ../backend/public

# 3. 커밋 & 푸시
cd .. && git add -A && git commit -m "설명" && git push origin main

# 4. Railway 배포
cd backend && railway up
```

---

## 11. 디자인

- **테마:** 밝은 톤 (bg: #faf9f6, accent: #f97316 오렌지)
- **폰트:** body 16px, Pretendard 기본, Noto Serif KR 제목
- **어드민:** 다크 테마, 청색 (#3a7bd5) 포인트
- **모바일:** 반응형, Web Share API 지원

---

## 12. 현재 데이터

- **레시피:** 1,413개
- **재료:** ~800개 (161개 주요 재료 아코디언 표시)
- **채널:** 자취요리신 (874), 백종원 (328), 삼플식당 (132), KBS (79)

---

## 13. 알려진 이슈 / 향후 과제

- Claude 할루시네이션: 간헐적으로 설명란에 없는 재료를 추가하는 경우 있음
- 동의어 자동 감지: 기준이 완벽하지 않아 수동 검수 필요
- 서브카테고리 분류: Claude 의존, 일부 부정확
- 다국어 대응: 미구현 (영어/일본어 준비 필요 시)
- 쿠팡 파트너스 API: 미사용 (시간당 10회 제한으로 비실용적)
- CI/CD: Railway GitHub 연동 자동 배포 미설정 (수동 railway up)
