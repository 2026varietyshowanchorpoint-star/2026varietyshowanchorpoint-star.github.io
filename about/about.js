import { SHOW, GREETING, HISTORY, TEAMS, GRADES } from './data.js?v=5';

const GRADE_LIST = [7, 8, 9, 10, 11, 12];
const $ = s => document.querySelector(s);

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
// 글이 있으면 그대로(줄바꿈 살려서), 없으면 점선 빈칸
function fill(text, hint, tag = 'p', cls = '') {
  const t = String(text ?? '').trim();
  if (!t) return `<${tag} class="blank ${cls}">${esc(hint)}</${tag}>`;
  return `<${tag} class="${cls}">${esc(t).replace(/\n/g, '<br>')}</${tag}>`;
}
function word(text, hint) {
  const t = String(text ?? '').trim();
  return t ? esc(t) : `<span class="blank-inline">${esc(hint)}</span>`;
}

function names(list) {
  return String(list || '').split(',').map(n => n.trim()).filter(Boolean)
    .map(n => `<span class="name">${esc(n)}</span>`).join('');
}
function teamPeople(t) {
  const rows = [];
  if (t.leaders) rows.push(`<div class="people"><b>${t.members ? '팀장' : '담당'}</b><div>${names(t.leaders)}</div></div>`);
  if (t.members) rows.push(`<div class="people"><b>팀원</b><div>${names(t.members)}</div></div>`);
  if (t.byGrade) for (const [g, list] of Object.entries(t.byGrade))
    rows.push(`<div class="people"><b><a href="${g}.html">${g}학년</a></b><div>${names(list)}</div></div>`);
  if (!rows.length) rows.push(`<p class="blank">팀원 빈칸</p>`);
  return rows.join('');
}
function gradeLeaders(g) {
  return TEAMS.map(t => t.byGrade?.[g]).filter(Boolean).join(', ');
}

// 사진: 파일 이름이 있으면 img/파일, 없으면 점선 자리
function pic(file, hint, cls = '') {
  const f = String(file ?? '').trim();
  if (!f) return `<div class="photo-slot ${cls}"><span>${esc(hint)}</span></div>`;
  const src = /^(https?:)?\/\//.test(f) || f.includes('/') ? f : `img/${f}`;
  return `<img class="photo ${cls}" src="${esc(src)}" alt="${esc(hint)}" loading="lazy">`;
}
function logo(cls) {
  return SHOW.logo
    ? `<img class="${cls}" src="img/${esc(SHOW.logo)}" alt="벌티 로고">`
    : `<span class="${cls} logo-slot">로고<br>자리</span>`;
}

function header(current) {
  const links = GRADE_LIST.map(g =>
    `<a href="${g}.html"${current === g ? ' aria-current="page"' : ''}>${g}학년</a>`).join('');
  return `
    <header class="bar">
      <a class="home" href="./"${current === 'home' ? ' aria-current="page"' : ''}>${logo('bar-logo')}<span>${esc(SHOW.title)}</span></a>
      <nav class="grade-nav" aria-label="학년">${links}</nav>
    </header>`;
}

function footer() {
  return `<footer class="foot">${esc(SHOW.title)} · <a href="../">펀드 주문</a></footer>`;
}

function showInfo() {
  return `
    <dl class="info">
      <div><dt>날짜</dt><dd>${word(SHOW.date, '날짜 빈칸')}</dd></div>
      <div><dt>장소</dt><dd>${word(SHOW.place, '장소 빈칸')}</dd></div>
    </dl>`;
}

function renderHome() {
  const history = HISTORY.map(h => `
    <li>
      <span class="year">${word(h.year, '연도')}</span>
      <div>
        ${fill(h.title, '그해 벌티 제목', 'h3')}
        ${fill(h.text, '그해 있었던 일')}
        ${pic(h.photo, '그해 사진 자리', 'history-photo')}
      </div>
    </li>`).join('');

  const teams = TEAMS.map((t, i) => `
    <article class="team${t.byGrade ? ' wide' : ''}${t.wide ? ' span2' : ''}">
      ${pic(t.photo, '팀 사진 자리', 'team-photo')}
      <span class="team-no">${String(i + 1).padStart(2, '0')}</span>
      ${fill(t.name, '팀 이름', 'h3')}
      ${t.what ? `<p class="what">${esc(t.what)}</p>` : ''}
      ${teamPeople(t)}
    </article>`).join('');

  const grades = GRADE_LIST.map(g => `
    <a class="grade-card" href="${g}.html">
      <span class="grade-num">${g}</span>
      <span class="grade-label">학년</span>
      <span class="grade-theme">${word(GRADES[g]?.theme, '주제 빈칸')}</span>
    </a>`).join('');

  document.body.innerHTML = `
    ${header('home')}
    <section class="hero">
      ${logo('hero-logo')}
      <p class="kicker">Variety Show</p>
      <h1>${esc(SHOW.title)}</h1>
      ${fill(SHOW.subtitle, '올해 벌티 주제 빈칸', 'p', 'hero-sub')}
      ${showInfo()}
    </section>
    <main class="wrap">
      <div class="main-photo">${pic(SHOW.photo, '첫 화면 큰 사진 자리 (포스터나 단체 사진)', 'wide-photo')}</div>
      <section class="block">
        <h2>대표 말씀</h2>
        <figure class="speech big">
          ${fill(GREETING.text, '대표 말씀이 들어갈 자리', 'blockquote')}
          <figcaption>${pic(GREETING.photo, '얼굴 사진', 'face')}<span class="who">${word(GREETING.name, '이름')} <span>${word(GREETING.role, '직함')}</span></span></figcaption>
        </figure>
      </section>

      <section class="block">
        <h2>벌티 역사</h2>
        <ol class="timeline">${history}</ol>
      </section>

      <section class="block">
        <h2>팀 소개</h2>
        <p class="lead">무대 뒤에서 벌티를 만드는 사람들</p>
        <div class="teams">${teams}</div>
      </section>

      <section class="block">
        <h2>학년별 무대</h2>
        <div class="grades">${grades}</div>
      </section>
    </main>
    ${footer()}`;
  document.title = `${SHOW.title} 소개`;
}

function renderGrade(g) {
  const d = GRADES[g] || {};
  const idx = GRADE_LIST.indexOf(g);
  const prev = GRADE_LIST[idx - 1], next = GRADE_LIST[idx + 1];
  const highlights = (d.highlights?.length ? d.highlights : ['']).map((h, i) => `
    <li><span>${i + 1}</span>${fill(h, '볼거리 빈칸', 'p')}</li>`).join('');

  document.body.innerHTML = `
    ${header(g)}
    <section class="hero grade-hero">
      <p class="kicker">${esc(SHOW.title)}</p>
      <h1><span class="big-num">${g}</span>학년</h1>
      ${fill(d.theme, '학년 주제 빈칸', 'p', 'hero-sub')}
    </section>
    <main class="wrap">
      <div class="main-photo">${pic(d.cover, `${g}학년 대표 사진 자리`, 'wide-photo')}</div>
      <section class="block">
        <h2>무대 내용</h2>
        ${fill(d.story, '이 학년 무대가 어떤 내용인지 들어갈 자리', 'p', 'story')}
      </section>

      <section class="block">
        <h2>주요 볼거리</h2>
        <ol class="highlights">${highlights}</ol>
      </section>

      <section class="block">
        <h2>사진</h2>
        <div class="gallery">${(d.photos?.length ? d.photos : ['']).map((p, i) => pic(p, `사진 자리 ${i + 1}`)).join('')}</div>
      </section>

      <section class="block">
        <h2>학년 리더</h2>
        ${gradeLeaders(g) ? `<div class="name-list">${names(gradeLeaders(g))}</div>` : '<p class="blank">학년 리더 명단 빈칸</p>'}
      </section>

      <section class="block two">
        <figure class="speech">
          <p class="who-tag">학년 리더의 말</p>
          ${fill(d.leader?.text, '학년 리더의 말이 들어갈 자리', 'blockquote')}
          <figcaption>${pic(d.leader?.photo, '얼굴', 'face')}<span class="who">${word(d.leader?.name, '이름')}</span></figcaption>
        </figure>
        <figure class="speech">
          <p class="who-tag">대표 학생의 말</p>
          ${fill(d.student?.text, '대표 학생의 말이 들어갈 자리', 'blockquote')}
          <figcaption>${pic(d.student?.photo, '얼굴', 'face')}<span class="who">${word(d.student?.name, '이름')}</span></figcaption>
        </figure>
      </section>

      <nav class="pager">
        ${prev ? `<a href="${prev}.html">${prev}학년</a>` : '<a href="./">처음으로</a>'}
        ${next ? `<a href="${next}.html">${next}학년</a>` : '<a href="./">처음으로</a>'}
      </nav>
    </main>
    ${footer()}`;
  document.title = `${g}학년 · ${SHOW.title}`;
}

const g = Number(document.body.dataset.grade);
if (GRADE_LIST.includes(g)) renderGrade(g); else renderHome();
