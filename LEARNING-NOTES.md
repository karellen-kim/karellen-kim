# 책·논문 학습자료 추가

홈페이지의 03 섹션은 `learning-notes.html`로 연결된다. 기존 기술 노트와 책·논문 학습자료는 별도 목록으로 관리한다.

- 디자인: `assets/css/learning.css`를 모든 학습 페이지에서 공유한다. 밝은 테마만 사용한다.
- 동작: `assets/js/learning.js`가 목록 검색·필터·목차 표시를 담당한다. Quiz는 질문 자체를 여는 HTML `details`다.
- 목록: `learning-catalog.json`의 `items`에 항목을 추가하면 목록에 표시된다.

항목에는 `id`, `type`(`book` 또는 `paper`), `title`, `authors` 배열, `year`, `href`, `description`을 기록한다. 책은 출판연도, 논문은 발표연도를 공식 출처에서 확인한다. `publisher`, `metadata_source` 등을 함께 기록할 수 있다.

새 본문 HTML은 기존 학습 페이지의 장 구조를 재사용한다. CSS와 JS를 복사하지 않고 아래 파일을 연결한다.

```html
<link rel="stylesheet" href="./assets/css/learning.css">
<script src="./assets/js/learning.js" defer></script>
```

장별 구성은 이 장의 핵심·학습 목표·핵심 설명·한눈에 정리·Quiz다. 독립된 학습 질문으로 소제목을 묶고, 시각 자료는 이해에 필요한 관계가 있을 때만 추가한다.
