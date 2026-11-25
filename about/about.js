import { SHOW, GREETING, HISTORY_INTRO, HISTORY, TEAMS, GRADES } from './data.js?v=6';

const GRADE_LIST = [7, 8, 9, 10, 11, 12];

// ---------- 작은 도구 ----------
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function has(v) { return String(v ?? '').trim() !== ''; }
function lines(s) { return esc(String(s).trim()).replace(/\n/g, '<br>'); }

// 글이 있으면 글, 없으면 점선 빈칸
function text(value, hint, tag = 'p', cls = '') {
  if (has(value)) return `<${tag} class="${cls}">${lines(value)}</${tag}>`;
  return `<${tag} class="${cls} blank">${esc(hint)}</${tag}>`;
}
function inline(value, hint) {
  return has(value) ? lines(value) : `<span class="blank-inline">${esc(hint)}</span>`;
}

// 사진: 파일 이름이 있으면 img/파일, 없으면 점선 "사진 넣을 자리"
function src(file) {
  const f = String(file).trim();
  return /^(https?:)?\/\//.test(f) || f.includes('/') ? f : `img/${f}`;
}
function photo(file, hint, cls = '', zoom = true) {
  if (!has(file)) return `<div class="photo-box ${cls}"><span>${esc(hint)}</span></div>`;
  return `<div class="photo-box has-photo ${cls}"><img src="${esc(src(file))}" alt="${esc(hint)}" loading="lazy"${zoom ? ' data-zoom' : ''}></div>`;
}

function names(list) {
  return String(list || '').split(',').map(n => n.trim()).filter(Boolean)
    .map(n => `<span class="name">${esc(n)}</span>`).join('');
}
function gradeLeaders(g) {
  return TEAMS.map(t => t.byGrade?.[g]).filter(Boolean).join(', ');
}
function sectionTitle(t) {
  return `<h3 class="section-title">${esc(t)}</h3><div class="title-underline"></div>`;
}

// ---------- 공통: 머리, 꼬리, 사진 크게 보기 ----------
function header(current) {
  const links = [
    ['./#greeting', '대표 말씀', 'greeting'],
    ['./#history', '역사', 'history'],
    ['./#teams', '팀 소개', 'teams'],
    ...GRADE_LIST.map(g => [`${g}.html`, `${g}학년`, g]),
  ].map(([href, label, key]) =>
    `<li><a href="${href}"${current === key ? ' aria-current="page"' : ''}>${label}</a></li>`).join('');
  return `
  <header id="siteHeader">
    <nav>
      <a class="logo" href="./">${esc(SHOW.title)}</a>
      <ul class="nav-links">${links}</ul>
    </nav>
  </header>
  <div id="headerSpacer"></div>`;
}

function footer() {
  return `
  <footer>
    ${esc(SHOW.title)}${has(SHOW.subtitle) ? ` &middot; ${esc(SHOW.subtitle)}` : ''}<br>
    <a href="../">펀드 주문 페이지</a>
  </footer>
  <div id="lightbox" class="lightbox" role="dialog" aria-label="사진 크게 보기">
    <button class="lightbox-close" type="button" aria-label="닫기">&times;</button>
    <img alt="">
  </div>`;
}

// 사람 말씀 카드: 사진(왼쪽, 세로) + 글(오른쪽)
function speechCard({ tag, name, role, photoFile, body, hint }) {
  return `
    <article class="speech-card">
      <div class="speech-photo">${photo(photoFile, '프로필 사진 넣을 자리', 'r23')}</div>
      <div class="speech-info">
        ${tag ? `<span class="stage-tag">${esc(tag)}</span>` : ''}
        <div class="speech-name">${inline(name, '이름')}${role !== undefined ? ` <span class="speech-role">${inline(role, '직함')}</span>` : ''}</div>
        ${text(body, hint, 'div', 'speech-text')}
      </div>
    </article>`;
}

// ---------- 첫 페이지 ----------
function renderHome() {
  const timeline = HISTORY.map(h => `
    <div class="tl-item">
      ${text(h.period, '시기 제목 (예: 2015년 ~ 2019년)', 'div', 'tl-period')}
      ${text(h.desc, '이 시기에 있었던 일', 'p', 'tl-desc')}
      <div class="tl-posters">
        ${(h.posters || []).map(p => `
          <div class="tl-poster">
            ${photo(p.photo, '포스터 넣을 자리', 'tl-photo')}
            <div class="tl-title">${inline(p.title, '제목')}</div>
            <div class="tl-year">${inline(p.year, '연도')}</div>
          </div>`).join('')}
      </div>
      ${(h.posters || []).length > 3 ? '<p class="tl-hint">옆으로 넘기면 포스터를 더 볼 수 있어요</p>' : ''}
    </div>`).join('');

  const teams = TEAMS.map(t => {
    const rows = [];
    if (t.leaders) rows.push(`<div class="team-row"><b>${t.members ? '팀장' : '담당'}</b><div>${names(t.leaders)}</div></div>`);
    if (t.members) rows.push(`<div class="team-row"><b>팀원</b><div>${names(t.members)}</div></div>`);
    if (t.byGrade) for (const [g, list] of Object.entries(t.byGrade))
      rows.push(`<div class="team-row"><b><a href="${g}.html">${g}학년</a></b><div>${names(list)}</div></div>`);
    return `
      <article class="team-card${t.byGrade ? ' full' : t.wide ? ' wide' : ''}">
        ${text(t.name, '팀 이름', 'div', 'role')}
        ${has(t.what) ? `<p class="team-what">${esc(t.what)}</p>` : ''}
        <div class="team-people">${rows.join('') || '<p class="blank">팀원 빈칸</p>'}</div>
      </article>`;
  }).join('');

  const grades = GRADE_LIST.map(g => `
    <a class="grade-card" href="${g}.html">
      <span class="grade-num">${g}</span><span class="grade-label">학년</span>
      <span class="grade-theme">${inline(GRADES[g]?.theme, '주제 빈칸')}</span>
      <span class="grade-go">자세히 보기</span>
    </a>`).join('');

  document.body.innerHTML = `
  ${header('home')}

  <section id="home" class="hero">
    <div class="hero-art">
      ${has(SHOW.logo)
        ? `<img class="hero-logo" src="${esc(src(SHOW.logo))}" alt="${esc(SHOW.title)} 로고">`
        : '<div class="hero-slot hero-slot--logo">로고 넣을 자리</div>'}
      ${has(SHOW.poster)
        ? `<img class="hero-poster" src="${esc(src(SHOW.poster))}" alt="${esc(SHOW.title)} 포스터" data-zoom>`
        : '<div class="hero-slot hero-slot--poster">포스터 넣을 자리</div>'}
    </div>
    <div class="hero-info">
      ${text(SHOW.subtitle, '올해 벌티 주제', 'p', 'hero-sub')}
      <p class="hero-when">${inline(SHOW.date, '날짜')} &middot; ${inline(SHOW.place, '장소')}</p>
    </div>
  </section>

  <section id="greeting" class="alt">
    ${sectionTitle('대표 말씀')}
    <div class="narrow">
      ${speechCard({ name: GREETING.name, role: GREETING.role, photoFile: GREETING.photo, body: GREETING.text, hint: '대표 말씀이 들어갈 자리' })}
    </div>
  </section>

  <section id="history">
    ${sectionTitle('역사')}
    <div class="history-body">
      ${text(HISTORY_INTRO.intro, '역사 첫 줄 (예: 20XX년에 시작해 올해로 N번째 벌티입니다)', 'p', 'history-lead')}
      ${text(HISTORY_INTRO.text, '벌티가 어떤 공연인지 설명')}
    </div>
    <div class="history-timeline">${timeline}</div>
    <div class="history-body">
      <div class="history-divider"></div>
      ${text(HISTORY_INTRO.finale, '마지막 문단 (예: 그렇게 이어져 온 올해의 무대가 ...입니다)', 'p', 'history-finale')}
    </div>
  </section>

  <section id="teams" class="alt">
    ${sectionTitle('팀 소개')}
    <p class="section-hint">무대 뒤에서 벌티를 만드는 사람들</p>
    <div class="team-grid">${teams}</div>
  </section>

  <section id="grades">
    ${sectionTitle('학년별 무대')}
    <p class="section-hint">학년을 누르면 주제와 볼거리, 리더들의 말을 볼 수 있어요</p>
    <div class="grade-grid">${grades}</div>
  </section>

  ${footer()}`;
  document.title = `${SHOW.title} 소개`;
}

// ---------- 학년 페이지 ----------
function renderGrade(g) {
  const d = GRADES[g] || {};
  const idx = GRADE_LIST.indexOf(g);
  const prev = GRADE_LIST[idx - 1], next = GRADE_LIST[idx + 1];
  const leaders = gradeLeaders(g);

  const highlights = (d.highlights?.length ? d.highlights : [{}]).map((h, i) => `
    <div class="stage-card">
      <span class="stage-tag">볼거리 ${i + 1}</span>
      ${text(h.title, '볼거리 이름', 'div', 'stage-title')}
      ${text(h.desc, '이 볼거리에 대한 설명', 'div', 'stage-desc')}
    </div>`).join('');

  const photos = (d.photos?.length ? d.photos : [{}]).map(p => `
    <div class="photo-scene">
      ${photo(p.photo, '사진 넣을 자리', 'r32')}
      ${has(p.caption) ? `<div class="photo-caption">${esc(p.caption)}</div>` : ''}
    </div>`).join('');

  document.body.innerHTML = `
  ${header(g)}

  <section id="home" class="hero grade-hero">
    <p class="hero-kicker">${esc(SHOW.title)}</p>
    <h1 class="grade-title"><span>${g}</span>학년</h1>
    ${text(d.theme, '학년 주제', 'p', 'hero-sub')}
    <div class="grade-cover">${photo(d.cover, `${g}학년 대표 사진 넣을 자리`, 'cover')}</div>
  </section>

  <section id="story" class="alt">
    ${sectionTitle('무대 소개')}
    <div class="history-body">
      ${text(d.story, '이 학년 무대가 어떤 내용인지 들어갈 자리', 'p', 'story')}
    </div>
    <div class="stage-grid">${highlights}</div>
  </section>

  <section id="leaders">
    ${sectionTitle('학년 리더')}
    <div class="leader-names">${leaders ? names(leaders) : '<span class="blank-inline">학년 리더 명단 빈칸</span>'}</div>
    <div class="speech-row">
      ${speechCard({ tag: '학년 리더의 말', name: d.leader?.name, photoFile: d.leader?.photo, body: d.leader?.text, hint: '학년 리더의 말이 들어갈 자리' })}
      ${speechCard({ tag: '대표 학생의 말', name: d.student?.name, photoFile: d.student?.photo, body: d.student?.text, hint: '대표 학생의 말이 들어갈 자리' })}
    </div>
  </section>

  <section id="photos" class="alt">
    ${sectionTitle('사진')}
    <p class="section-hint">사진을 누르면 크게 볼 수 있어요</p>
    <div class="photo-pano">
      <div class="panorama-wrap"><div class="panorama-track">${photos}</div></div>
      <button class="pano-nav prev" type="button" aria-label="이전 사진">&#8249;</button>
      <button class="pano-nav next" type="button" aria-label="다음 사진">&#8250;</button>
    </div>
  </section>

  <nav class="pager">
    ${prev ? `<a href="${prev}.html">&#8249; ${prev}학년</a>` : '<a href="./">&#8249; 처음으로</a>'}
    ${next ? `<a href="${next}.html">${next}학년 &#8250;</a>` : '<a href="./">처음으로 &#8250;</a>'}
  </nav>

  ${footer()}`;
  document.title = `${g}학년 · ${SHOW.title}`;

  const wrap = document.querySelector('.panorama-wrap');
  const step = () => (wrap.querySelector('.photo-scene')?.offsetWidth || 300) + 14;
  document.querySelector('.pano-nav.prev').addEventListener('click', () => wrap.scrollBy({ left: -step(), behavior: 'smooth' }));
  document.querySelector('.pano-nav.next').addEventListener('click', () => wrap.scrollBy({ left: step(), behavior: 'smooth' }));
}

// ---------- 시작 ----------
const g = Number(document.body.dataset.grade);
if (GRADE_LIST.includes(g)) renderGrade(g); else renderHome();

// 고정된 머리 높이만큼 아래로 밀기
const head = document.getElementById('siteHeader');
const spacer = document.getElementById('headerSpacer');
function syncHeader() {
  const h = head.offsetHeight;
  document.documentElement.style.setProperty('--header-h', h + 'px');
  spacer.style.height = h + 'px';
}
syncHeader();
window.addEventListener('resize', syncHeader);
window.addEventListener('load', syncHeader);

// 지금 보고 있는 학년 메뉴가 보이게 옆으로 밀어 두기
document.querySelector('.nav-links a[aria-current]')?.scrollIntoView({ inline: 'center', block: 'nearest' });

// 사진 크게 보기: 사진, 바깥, X 어디를 눌러도 닫힌다
const box = document.getElementById('lightbox');
const boxImg = box.querySelector('img');
document.addEventListener('click', e => {
  const img = e.target.closest('img[data-zoom]');
  if (img) { boxImg.src = img.src; boxImg.alt = img.alt; box.classList.add('open'); return; }
  if (box.contains(e.target)) { box.classList.remove('open'); boxImg.src = ''; }
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') box.classList.remove('open'); });

// 사진 파일 이름이 틀려서 안 열리면 다시 "사진 넣을 자리"로 돌려놓기
document.querySelectorAll('.photo-box.has-photo img').forEach(img => {
  img.addEventListener('error', () => {
    const b = img.parentElement;
    b.classList.remove('has-photo');
    b.innerHTML = `<span>사진을 못 찾았어요<br>${esc(img.getAttribute('src'))}</span>`;
  });
});
