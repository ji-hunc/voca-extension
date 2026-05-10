# VocaNova Chrome Extension

웹페이지에서 영어 단어를 드래그하거나 더블클릭하면 즉시 네이버 사전 팝업을 띄우고, 한 번의 클릭으로 단어장에 저장하는 크롬 익스텐션입니다.

VocaNova 프로젝트의 일부로, 같은 Supabase 백엔드를 공유하는 [iOS 앱(`VocaNova`)](../VocaNova) / [macOS 앱(`VocaNovaApp`)](../VocaNovaApp) 과 단어장 데이터를 실시간으로 주고받습니다.

<!-- 스크린샷 영역 -->

## 주요 기능

- **드래그 / 더블클릭 검색** — 어떤 웹페이지에서든 영어 단어를 선택하면 커서 근처에 사전 팝업이 자동으로 뜸
- **네이버 영어 사전 결과** — 발음(IPA + 오디오), 품사별 뜻, 예문, 유/반의어 표시
- **한 번에 단어장 저장** — 로그인 후 팝업의 저장 버튼으로 클라우드 단어장에 추가
- **Google 로그인** — Chrome `identity` API로 OAuth 처리
- **Shadow DOM 격리** — 호스트 페이지 스타일과 충돌하지 않도록 팝업을 Shadow DOM 안에 렌더

## 배포

<!-- TODO: Chrome 웹 스토어에 게시 후 링크 추가 -->

## 기술 스택

- **런타임**: Chrome Extension Manifest V3 (Service Worker + Content Script)
- **언어**: Vanilla JavaScript
- **API**: 네이버 영어 사전 API (`en.dict.naver.com`)
- **백엔드**: Supabase (Auth, PostgREST RPC)
- **인증**: `chrome.identity` (Google OAuth) → Supabase 세션 교환
- **네트워크 헤더 조작**: `declarativeNetRequest` 로 네이버 API 호출 시 Referer 주입

## 아키텍처

```
┌────────────────────┐    ┌────────────────────┐    ┌──────────────────┐
│  content.js        │ →  │  background.js     │ →  │  Naver Dict API  │
│  (선택 감지/팝업)   │    │  (서비스 워커)      │    └──────────────────┘
└────────────────────┘    │                    │    ┌──────────────────┐
                          │                    │ →  │  Supabase        │
                          └────────────────────┘    │  (Auth + RPC)    │
                                                    └──────────────────┘
```

- 콘텐츠 스크립트가 사용자의 텍스트 선택을 감지하고, 백그라운드 워커에 메시지를 보내 사전 결과를 받아옵니다.
- 단어 저장은 백그라운드 워커가 Supabase의 `add_word_to_vocab` RPC를 호출해 처리합니다.
- 같은 Supabase 프로젝트를 iOS / macOS 클라이언트와 공유하므로, 익스텐션에서 저장한 단어가 다른 기기에서도 동일하게 보입니다.
