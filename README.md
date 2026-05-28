# Inflearn 자막 → Markdown 크롬 확장

인프런 강의 페이지에서 **스크립트(자막) 패널을 열 때 발생하는 자막 요청**(`/encrypted/subtitles/json`)을 가로채, 강사가 말한 내용을 **학습용 Markdown 파일**로 저장하는 크롬 확장입니다. 1차 요약 작업의 입력으로 그대로 쓸 수 있습니다.

## 동작 방식

```
[강의 페이지에서 스크립트 패널 열기]
        │  (페이지가 subtitles/json 요청)
        ▼
inject.js (MAIN world)   ← fetch/XHR 를 감싸 응답 가로채기
        │  window.postMessage
        ▼
content.js (ISOLATED)    ← Markdown 변환 + 화면 우하단 다운로드 버튼 + storage 저장
        │  chrome.runtime.sendMessage
        ▼
background.js            ← chrome.downloads 로 .md 저장
```

- 서명 URL(`Policy`/`Signature`)을 직접 다루지 않습니다. 페이지가 정상적으로 받은 응답을 그대로 읽기만 합니다.
- 응답 형태: `[{"start":786,"end":5265,"text":"...","speaker":0}, ...]` (start/end 는 ms).

## 설치 (개발자 모드 / 압축 해제된 확장)

1. 크롬 주소창에 `chrome://extensions` 입력
2. 우측 상단 **개발자 모드** 토글 ON
3. **압축해제된 확장 프로그램을 로드합니다** 클릭
4. 이 폴더(`~/tools/inflearn-subtitle-extractor`) 선택

## 사용법

1. 인프런 강의 재생 페이지로 이동
2. 우측 **스크립트(자막)** 버튼 클릭 → 자막 패널 표시
3. 화면 우하단에 **`📄 자막 MD 다운로드`** 버튼이 나타남 → 클릭하면 `.md` 저장
4. 또는 툴바의 확장 아이콘(팝업)에서 캡처 목록 확인 → **MD 다운로드** / **복사**(클립보드)

### 1차 요약으로 이어가기

- 팝업의 **복사** 버튼으로 트랜스크립트를 클립보드에 담은 뒤 Claude 에 붙여넣어 요약을 요청하거나,
- 저장된 `.md` 파일을 그대로 넘기면 됩니다.

## 산출물 저장 위치 (중요한 제약)

크롬 확장은 보안상 **다운로드 폴더 밖으로 파일을 쓸 수 없습니다.** 따라서 파일은
`~/Downloads/inflearn-subtitles/<강의명>.md` 에 저장됩니다.

이 도구 폴더(`~/tools/inflearn-subtitle-extractor/outputs/`)에 모으고 싶다면 둘 중 하나:

```bash
# (1) 수동/주기적 이동
mv ~/Downloads/inflearn-subtitles/*.md ~/tools/inflearn-subtitle-extractor/outputs/

# (2) 심볼릭 링크로 한 폴더처럼 사용
ln -s ~/Downloads/inflearn-subtitles ~/tools/inflearn-subtitle-extractor/outputs/_downloads
```

## 생성되는 Markdown 예시

```markdown
# 통합 테스트 가속화 (tmpfs / Docker)

- 캡처 일시: 2026-05-29T...
- 영상 ID: 541cdded-7462-46f6-8680-5d19274b8757
- 세그먼트 수: 42

> 개인 학습용 자막 추출. 외부 재배포 금지.

---

[00:00] 고성능 Java Persistence 교육의 새로운 에피소드에 오신 것을 환영합니다.
[00:05] 이번 에피소드에서는 통합 테스트에 대해 다루겠습니다.
...
```

## 트러블슈팅

- **버튼이 안 뜬다 / 팝업이 비어있다**: 스크립트 패널을 열어야 자막 요청이 발생합니다. 이미 캐시된 경우 패널을 닫았다 다시 열거나 새로고침 후 다시 시도.
- **그래도 안 잡힌다**: 플레이어가 `*.inflearn.com` 이 아닌 별도 도메인 iframe 일 수 있습니다. `chrome://extensions` 에서 서비스워커 콘솔/페이지 콘솔 로그를 확인하고, 해당 도메인을 `manifest.json` 의 `matches` 와 `host_permissions` 에 추가하세요.
- **변경 후 반영 안 됨**: `chrome://extensions` 에서 이 확장의 새로고침(↻) 버튼을 누르세요.

## 주의

- 본인이 구매·수강 중인 강의의 **개인 학습 노트** 용도로만 사용하세요. 외부 재배포 금지.
- HAR 파일과 서명 URL(`Policy`/`Signature`)은 세션 토큰이 포함된 민감정보입니다. 공유/커밋하지 마세요.
