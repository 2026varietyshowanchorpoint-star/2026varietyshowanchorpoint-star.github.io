import { SHOW, GREETING, HISTORY, TEAMS, GRADES } from './data.js';

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

function header(current) {
  const links = GRADE_LIST.map(g =>
    `<a href="${g}.html"${current === g ? ' aria-current="page"' : ''}>${g}학년</a>`).join('');
  return `
    <header class="bar">
      <a class="home" href="./"${current === 'home' ? ' aria-current="page"' : ''}>${esc(SHOW.title)}</a>
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
      </div>
    </li>`).join('');

  const teams = TEAMS.map((t, i) => `
    <article class="team">
      <span class="team-no">${String(i + 1).padStart(2, '0')}</span>
      ${fill(t.name, '팀 이름', 'h3')}
      ${fill(t.what, '이 팀이 하는 일')}
      <p class="people"><b>팀장</b> ${word(t.leader, '이름')}</p>
      <p class="people"><b>팀원</b> ${word(t.members, '이름들')}</p>
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
      <p class="kicker">Variety Show</p>
      <h1>${esc(SHOW.title)}</h1>
      ${fill(SHOW.subtitle, '올해 벌티 주제 빈칸', 'p', 'hero-sub')}
      ${showInfo()}
    </section>
    <main class="wrap">
      <section class="block">
        <h2>대표 말씀</h2>
        <figure class="speech big">
          ${fill(GREETING.text, '대표 말씀이 들어갈 자리', 'blockquote')}
          <figcaption>${word(GREETING.name, '이름')} <span>${word(GREETING.role, '직함')}</span></figcaption>
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
      <section class="block">
        <h2>무대 내용</h2>
        ${fill(d.story, '이 학년 무대가 어떤 내용인지 들어갈 자리', 'p', 'story')}
      </section>

      <section class="block">
        <h2>주요 볼거리</h2>
        <ol class="highlights">${highlights}</ol>
      </section>

      <section class="block two">
        <figure class="speech">
          <p class="who-tag">학년 리더</p>
          ${fill(d.leader?.text, '학년 리더의 말이 들어갈 자리', 'blockquote')}
          <figcaption>${word(d.leader?.name, '이름')}</figcaption>
        </figure>
        <figure class="speech">
          <p class="who-tag">대표 학생</p>
          ${fill(d.student?.text, '대표 학생의 말이 들어갈 자리', 'blockquote')}
          <figcaption>${word(d.student?.name, '이름')}</figcaption>
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
