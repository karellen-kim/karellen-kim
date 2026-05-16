# karellen-kim — 학습 노트 사이트

이 저장소는 읽은 글·논문·기술 문서를 정리한 학습 노트 모음이다. 모든 노트는 정확히 동일한 구조와 디자인 시스템을 따른다.

---

## 노트 작성 규칙 (절대 준수)

### 1. 파일 위치 / 이름

- 모든 노트는 저장소 루트에 단일 HTML 파일로 작성한다 (서브 디렉토리 만들지 않음)
- 파일명은 원문 제목의 영문 핵심을 케밥 케이스로: `building-effective-agents.html`, `multi-agent-research-system.html`
- 다국어 제목이면 영문 키워드만 추출

### 2. 섹션 구조 — 항상 3개 + 선택적 1개

| § | 제목 | 역할 |
|---|---|---|
| 01 | 한 줄로 이해하기 | 1분 안에 핵심만. 드롭캡 lead + 6개 번호 매겨진 핵심 포인트 |
| 02 | (주제에 맞는 타이틀) | 그림으로 보는 구조. CSS 다이어그램 4~7개, 각각 텍스트 설명 + Use-when 박스 |
| 03 | 실전 코드 | Python 구현 예제. Anthropic SDK 기준. 각 코드 카드 하단에 포인트 노트 |
| 04 (선택) | 실무 도입 가이드 | ROI Tier 매트릭스 + 도입 로드맵 + 안티패턴. 필요할 때만 추가 |

### 3. TOC / 햄버거 메뉴 — 필수

- 우측 상단 고정 햄버거 버튼 (48×48, 검정 보더, 호버시 반전, 열리면 X로 변형)
- 오른쪽에서 슬라이드인 패널 (380px), 백드롭 블러
- 목차 항목: "서문" + §01·§02 (서브 항목 포함)·§03·§04
- "서문"은 `.no-num` 클래스로 — 카운터가 §01부터 01로 시작해야 본문 번호와 일치
- 백드롭 클릭 / ESC / 링크 클릭 시 자동 닫힘

### 4. 디자인 시스템 — 변경 금지

```css
--paper:        oklch(1 0 0);             /* 순백 배경 */
--paper-deep:   oklch(0.985 0 0);
--ink:          oklch(0.18 0.015 260);
--ink-soft:     oklch(0.38 0.012 260);
--ink-faint:    oklch(0.58 0.008 260);
--rule:         oklch(0.90 0.005 260);
--accent:       oklch(0.55 0.16 38);      /* 시에나 */
--accent-deep:  oklch(0.40 0.14 38);
--accent-wash:  oklch(0.96 0.025 50);
--sans: "IBM Plex Sans KR", -apple-system, BlinkMacSystemFont, sans-serif;
--mono: "JetBrains Mono", ui-monospace, monospace;
```

- 폰트는 **IBM Plex Sans KR + JetBrains Mono 두 가지만**. 세리프 / italic 사용 금지 (한글 italic이 깨짐)
- 강조는 weight(200~600) 대비로만. `font-style: italic` 사용 금지
- body 기본: `font-size: 15px; line-height: 1.6;`
- hero-title: `clamp(2.6rem, 7vw, 5.8rem)`, weight 600, letter-spacing -0.035em
- section-num: `clamp(3rem, 7vw, 5.5rem)`, weight 200, 액센트 색
- section-title: `clamp(1.65rem, 3.2vw, 2.3rem)`, weight 600
- 다이어그램 h4: `clamp(1.3rem, 2.3vw, 1.75rem)`, weight 600
- 본문 lead 문단에는 `max-width: ch` 금지 — 우측 공백 발생함

### 5. 다이어그램 작성 규칙

- 이미지·SVG 라이브러리 사용 금지. 모든 다이어그램은 **순수 HTML + CSS Grid/Flex**로
- 캔버스: `min-height: 260px`, `overflow: hidden`, 좌상단에 `data-label`로 패턴 라벨
- 박스: `min-width: 0` + `max-width: 100%` + `flex-direction: column` 기본 — 그리드 셀 안에서 안전하게 줄어들도록
- 그리드 컬럼 폭에는 `minmax(0, 1fr)` 사용 — 단순 `1fr`은 오버플로우 일으킴
- 인덱스 박스 (라우터·허브 등)는 `display: flex` 명시 (inline-flex는 width 적용 안 됨)
- 다이어그램 옆 텍스트: 본문 설명 + `.use-when` 박스 (좌측 액센트 보더, "언제 쓰나" 라벨)

### 6. 코드 카드 규칙

- 다크 배경 (`oklch(0.18 0.02 260)`), JetBrains Mono, 0.78rem
- 상단 헤드에 제목 + 우측 작은 태그 (예: `building block`, `workflow`, `autonomous`)
- 코드 하단 노트(`.note`)에 핵심 포인트 1문장 — `<strong>포인트.</strong>` 강조어로 시작
- 토큰 색상: 키워드(주황), 문자열(녹색), 주석(회색 italic), 함수(파랑), 데코레이터(노랑)
- HTML 안에 코드 작성 시 `&lt; &gt;`로 이스케이프

### 7. 본문 작성 톤

- 한국어. 미괄식. 결론은 마지막에
- 숫자·구체적 수치 우선. "좋다/나쁘다" 금지
- 이모지 사용 금지
- 강조는 `<strong>`(굵게)와 `<em>`(액센트 색)으로만
- 한 문단 3~4줄 이상 넘기지 말 것
- 코드 안 주석은 한국어로

### 8. 마진 노트 (`.margin-note`)

- 섹션 사이에 한두 개. 본문에서 빠진 미묘한 디테일 / 원문 저자의 부연 / 안티패턴 경고
- 좌측 액센트 라벨 "노트", 회색 톤 배경

### 9. index.html 갱신

새 노트 추가 시 항상:
- `index.html`의 `.notes` 영역에 새 `<a class="note">` 항목 추가 (가장 위)
- 노트 번호 (001, 002, ...) 증가
- hero-grid의 "노트 N개" 카운트 업데이트
- meta-row의 "last updated" 월 갱신

### 10. 푸터

- "— end of notes —" 같은 장식 라인 추가 금지
- 우측에 "원문 · <원문 URL>" 링크만

---

## 작업 순서

1. 새 노트 요청 받음
2. 위 규칙대로 파일 작성 (기존 `building-effective-agents.html`을 템플릿으로 사용 — CSS는 거의 그대로 복사)
3. `index.html` 업데이트
4. 커밋 (메시지는 `add <topic> study notes`, body에 핵심 변경 설명) → 푸시

## 푸시 정책

- 학습 노트 추가/수정은 사용자 명시 요청 없이도 푸시해도 됨 (이 저장소는 학습 노트 사이트로만 운영됨)
- 단, CLAUDE.md 수정처럼 메타 변경은 명시 요청 시에만

---

## 슈퍼파워 워크플로우 — 적용 제외

이 프로젝트는 단일 자가용 학습 노트 사이트이므로 superpowers 스킬 워크플로우(TDD·executing-plans·verification 등)를 적용하지 않는다. plan은 작성하되 한두 문장으로 충분.
