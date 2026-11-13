/* Shared interactions for book/paper catalogs and chapter notes. */
(() => {
  'use strict';
  const scriptURL = document.currentScript.src;
  const navLinks = [...document.querySelectorAll('.sidebar a[href^="#"]')];
  const chapters = [...document.querySelectorAll('main > section[id]')];
  if (navLinks.length && chapters.length) {
    const activate = id => navLinks.forEach(link => {
      const active = link.hash === '#' + id;
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    let scheduled = false;
    const update = () => {
      let current = chapters[0];
      for (const chapter of chapters) {
        if (chapter.getBoundingClientRect().top <= 150) current = chapter;
        else break;
      }
      activate(current.id); scheduled = false;
    };
    addEventListener('scroll', () => {
      if (!scheduled) { scheduled = true; requestAnimationFrame(update); }
    }, { passive: true });
    addEventListener('hashchange', () => activate(location.hash.slice(1) || 'overview'));
    activate(location.hash.slice(1) || 'overview');
  }

  const search = document.querySelector('#library-search');
  if (!search) return;
  const buttons = [...document.querySelectorAll('.filters button')];
  const empty = document.querySelector('.empty');
  const count = document.querySelector('.catalog-foot');
  let selected = 'all';
  let items = [...document.querySelectorAll('.catalog-item')];
  const filter = () => {
    const query = search.value.trim().toLocaleLowerCase();
    let visible = 0;
    for (const item of items) {
      const matches = (selected === 'all' || selected === item.dataset.type) &&
        item.dataset.search.toLocaleLowerCase().includes(query);
      item.hidden = !matches;
      if (matches) visible++;
    }
    empty.hidden = visible > 0;
    empty.textContent = selected === 'paper' && !query ?
      '아직 등록한 논문이 없다.' : '조건에 맞는 학습자료가 없다.';
    count.textContent = '학습자료 ' + visible + '개';
  };
  for (const button of buttons) button.addEventListener('click', () => {
    selected = button.dataset.type;
    for (const other of buttons) other.setAttribute('aria-pressed', String(button === other));
    filter();
  });
  search.addEventListener('input', filter);

  const node = (tag, className, text) => {
    const element = document.createElement(tag);
    element.className = className;
    element.textContent = text;
    return element;
  };
  const renderItem = data => {
    const link = node('a', 'catalog-item', '');
    link.href = data.href;
    link.dataset.type = data.type;
    link.dataset.search = [data.title, ...(data.authors || []), data.year].join(' ');
    const content = document.createElement('div');
    content.append(node('h2', '', data.title),
      node('p', 'authors', (data.authors || []).join(' · ')),
      node('p', 'catalog-description', data.description || ''));
    link.append(content, node('span', 'catalog-year', data.year || '연도 미상'),
      node('span', 'catalog-type', data.type === 'paper' ? '논문' : '책'));
    return link;
  };
  // Static HTML remains usable if the catalog request is unavailable.
  fetch(new URL('../../learning-catalog.json', scriptURL))
    .then(response => { if (!response.ok) throw new Error('catalog'); return response.json(); })
    .then(data => {
      if (!Array.isArray(data.items)) return;
      const next = data.items.map(renderItem);
      items.forEach(item => item.remove());
      next.forEach(item => empty.before(item));
      items = next; filter();
      document.documentElement.dataset.catalogReady = 'true';
    })
    .catch(() => filter());
})();
