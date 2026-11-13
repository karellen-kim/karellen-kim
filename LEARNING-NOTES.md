# 책·논문 학습자료 추가

홈페이지 03 → learning-notes.html → 책·논문 본문으로 이동한다.

## 재사용 파일

- `assets/css/muse-core-light.css`: MUSE 기본 토큰·컴포넌트. 밝은 테마 전용이다.
- `assets/css/learning-study.css`: 두 책의 공통 본문·목차·표·Quiz 배치다.
- `assets/css/learning-diagrams.css`: 모든 학습 도식의 프레임·노드·비교 표현이다.
- `assets/css/muse-diagram-light.css`: MUSE 차트 스타일이다.
- `assets/css/learning-catalog.css`: 책·논문 목록 전용 배치다.
- `assets/js/learning.js`: 목차 위치 표시와 목록 검색·필터다.
- `assets/js/muse-light.js`: 인쇄 등 공통 MUSE 동작이다. 테마 선택을 읽지 않는다.
- `assets/js/muse-chart.js`: HTML의 JSON 데이터를 차트로 그린다.

공개 본문과 로컬 `all-chapters.html` 모두 같은 CSS·JS 파일을 참조한다. 책별 HTML에는 본문과 도표 데이터만 둔다. Quiz는 질문을 클릭하면 펼쳐지는 기본 HTML details다.

## 새 자료

`learning-catalog.json`의 items에 id·type·title·authors·year·href·description을 추가한다. 출판·발표연도는 공식 출처를 확인한다. 기존 본문의 장 구조와 같은 공통 에셋을 연결한다.

장 구성은 이 장의 핵심·학습 목표·핵심 설명·한눈에 정리·Quiz다. 목차의 큰 그룹만 볼드로 표시한다. 핵심과 목표는 같은 폭으로 나누고, 본문은 화면에 맞춰 넓히되 도식에는 별도 최대 폭을 둔다.
