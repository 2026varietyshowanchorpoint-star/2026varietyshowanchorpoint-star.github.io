import { SHOW, GREETING, HISTORY_INTRO, HISTORY, TEAMS, GRADES, DAILY } from './data.js?v=7';
import { COMMENTS_ON, watchPage, addComment } from './comments.js?v=7';

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
// 'logo.png' → img/logo.png, 'daily/1215-1.jpg' → img/daily/1215-1.jpg
function src(file) {
  const f = String(file).trim();
  return /^(https?:)?\/\//.test(f) || f.startsWith('/') || f.startsWith('../') ? f : `img/${f}`;
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
    ['daily.html', '매일 사진', 'daily'],
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

  const photos = (d.photos?.length ? d.photos : [{}])
    .map(p => `<div class="photo-scene">${photoCard(`grade-${g}`, p)}</div>`).join('');

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
    <p class="section-hint">사진을 누르면 크게 보고 댓글을 남길 수 있어요</p>
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
  startComments(`grade-${g}`);

  const wrap = document.querySelector('.panorama-wrap');
  const step = () => (wrap.querySelector('.photo-scene')?.offsetWidth || 300) + 14;
  document.querySelector('.pano-nav.prev').addEventListener('click', () => wrap.scrollBy({ left: -step(), behavior: 'smooth' }));
  document.querySelector('.pano-nav.next').addEventListener('click', () => wrap.scrollBy({ left: step(), behavior: 'smooth' }));
}

// ---------- 댓글 달 수 있는 사진 카드 ----------
function photoCard(page, p) {
  if (!has(p.photo)) return photo('', '사진 넣을 자리', 'r32');
  const id = `${page}/${String(p.photo).trim()}`;
  return `
    <figure class="pcard" data-photo-id="${esc(id)}" data-src="${esc(src(p.photo))}" data-caption="${esc(p.caption || '')}">
      <button class="pcard-img" type="button" aria-label="사진 크게 보고 댓글 달기">
        <img src="${esc(src(p.photo))}" alt="${esc(p.caption || '사진')}" loading="lazy">
      </button>
      <figcaption>
        <span class="pcard-cap">${esc(p.caption || '')}</span>
        ${COMMENTS_ON ? '<button class="pcard-chip" type="button">댓글 <b>0</b></button>' : ''}
      </figcaption>
    </figure>`;
}

// ---------- 매일 사진 페이지 ----------
function renderDaily() {
  const days = (DAILY || []).filter(d => has(d.date) || (d.photos || []).some(p => has(p.photo)));
  const body = days.length ? days.map((d, i) => `
    <section class="${i % 2 ? '' : 'alt'} day">
      <h3 class="section-title">${esc(d.date || '')}</h3>
      <div class="title-underline"></div>
      ${has(d.title) ? `<p class="day-title">${lines(d.title)}</p>` : ''}
      ${has(d.note) ? `<p class="day-note">${lines(d.note)}</p>` : ''}
      <div class="photo-grid">
        ${(d.photos || []).filter(p => has(p.photo)).map(p => photoCard('daily', p)).join('') || '<p class="blank">이날 사진 빈칸</p>'}
      </div>
    </section>`).join('') : `
    <section class="alt">
      <div class="history-body"><p class="blank">벌티가 시작하면 여기에 매일 새 사진이 올라와요</p></div>
    </section>`;

  document.body.innerHTML = `
  ${header('daily')}
  <section id="home" class="hero grade-hero">
    <p class="hero-kicker">${esc(SHOW.title)}</p>
    <h1 class="grade-title">매일 사진</h1>
    <p class="hero-when">준비하는 동안 날마다 새 사진이 올라와요. 사진을 누르면 크게 보고 댓글을 남길 수 있어요.</p>
  </section>
  ${body}
  ${footer()}`;
  document.title = `매일 사진 · ${SHOW.title}`;
  startComments('daily');
}

// ---------- 사진 보기 + 댓글 창 ----------
let commentsByPhoto = {};
let viewerId = null;
let commentsError = '';

function viewerHtml() {
  return `
  <div id="viewer" class="viewer" role="dialog" aria-modal="true" aria-label="사진과 댓글">
    <div class="viewer-box">
      <button class="viewer-close" type="button" aria-label="닫기">&times;</button>
      <div class="viewer-photo"><img alt=""></div>
      <div class="viewer-side">
        <p class="viewer-caption"></p>
        ${COMMENTS_ON ? `
        <h4 class="viewer-head">댓글 <span class="viewer-count"></span></h4>
        <ul class="comment-list"></ul>
        <form class="comment-form" autocomplete="off">
          <div class="comment-who">
            <input name="name" maxlength="20" placeholder="이름 (예: 9학년 김OO 엄마)" aria-label="이름">
            <label class="anon"><input type="checkbox" name="anon"> 익명</label>
          </div>
          <textarea name="text" maxlength="500" rows="3" placeholder="응원의 한마디를 남겨 주세요" aria-label="댓글 내용"></textarea>
          <div class="comment-actions">
            <span class="form-msg" role="status"></span>
            <button type="submit">댓글 남기기</button>
          </div>
        </form>` : ''}
      </div>
    </div>
  </div>`;
}

function timeText(ms) {
  if (!ms) return '방금';
  return new Date(ms).toLocaleString('ko-KR', { month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function renderViewerComments() {
  const v = document.getElementById('viewer');
  if (!v || !viewerId || !COMMENTS_ON) return;
  const list = commentsByPhoto[viewerId] || [];
  v.querySelector('.viewer-count').textContent = list.length ? list.length : '';
  const ul = v.querySelector('.comment-list');
  if (commentsError) { ul.innerHTML = `<li class="comment-empty">${esc(commentsError)}</li>`; return; }
  ul.innerHTML = list.length ? list.map(c => `
    <li class="comment">
      <div class="comment-meta"><b>${has(c.name) ? esc(c.name) : '익명'}</b><span>${timeText(c.createdAt)}</span></div>
      <p>${lines(c.text)}</p>
    </li>`).join('') : '<li class="comment-empty">아직 댓글이 없어요. 첫 댓글을 남겨 주세요.</li>';
  ul.scrollTop = ul.scrollHeight;
}

function openViewer(card) {
  const v = document.getElementById('viewer');
  viewerId = card.dataset.photoId;
  v.querySelector('.viewer-photo img').src = card.dataset.src;
  v.querySelector('.viewer-photo img').alt = card.dataset.caption || '사진';
  const cap = v.querySelector('.viewer-caption');
  cap.textContent = card.dataset.caption || '';
  cap.hidden = !card.dataset.caption;
  v.classList.add('open');
  document.body.classList.add('no-scroll');
  renderViewerComments();
}
function closeViewer() {
  const v = document.getElementById('viewer');
  if (!v) return;
  v.classList.remove('open');
  document.body.classList.remove('no-scroll');
  viewerId = null;
}

function updateChips() {
  document.querySelectorAll('.pcard').forEach(card => {
    const b = card.querySelector('.pcard-chip b');
    if (b) b.textContent = (commentsByPhoto[card.dataset.photoId] || []).length;
  });
}

function startComments(page) {
  document.body.insertAdjacentHTML('beforeend', viewerHtml());
  const v = document.getElementById('viewer');

  document.addEventListener('click', e => {
    const card = e.target.closest('.pcard');
    if (card && (e.target.closest('.pcard-img') || e.target.closest('.pcard-chip'))) { openViewer(card); return; }
    if (e.target === v || e.target.closest('.viewer-close')) closeViewer();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeViewer(); });

  if (!COMMENTS_ON) return;

  // 이름은 이 기기에 기억해 둔다
  const form = v.querySelector('.comment-form');
  const nameIn = form.elements.name, anonIn = form.elements.anon, textIn = form.elements.text;
  const msg = form.querySelector('.form-msg');
  try { nameIn.value = localStorage.getItem('bulti-comment-name') || ''; } catch (e) { /* 무시 */ }
  anonIn.addEventListener('change', () => { nameIn.disabled = anonIn.checked; });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const text = textIn.value.trim();
    const name = anonIn.checked ? '' : nameIn.value.trim();
    if (!text) { msg.textContent = '댓글 내용을 적어 주세요'; textIn.focus(); return; }
    if (!anonIn.checked && !name) { msg.textContent = '이름을 적거나 익명을 골라 주세요'; nameIn.focus(); return; }
    const btn = form.querySelector('button[type=submit]');
    btn.disabled = true; msg.textContent = '올리는 중...';
    try {
      await addComment({ page, photoId: viewerId, name, text });
      textIn.value = ''; msg.textContent = '댓글을 남겼어요';
      try { if (name) localStorage.setItem('bulti-comment-name', name); } catch (e2) { /* 무시 */ }
    } catch (err) {
      console.error(err);
      msg.textContent = '댓글을 올리지 못했어요. 잠시 뒤 다시 해 주세요.';
    } finally { btn.disabled = false; }
  });

  watchPage(page, list => {
    commentsError = '';
    commentsByPhoto = {};
    for (const c of list) (commentsByPhoto[c.photoId] ||= []).push(c);
    updateChips();
    renderViewerComments();
  }, err => {
    console.error(err);
    commentsError = '댓글을 불러오지 못했어요.';
    renderViewerComments();
  }).catch(err => { console.error(err); commentsError = '댓글을 불러오지 못했어요.'; });
}

// ---------- 시작 ----------
const g = Number(document.body.dataset.grade);
if (document.body.dataset.page === 'daily') renderDaily();
else if (GRADE_LIST.includes(g)) renderGrade(g);
else renderHome();

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
