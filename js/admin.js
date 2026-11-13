// 관리자용 화면 (staff: 주문 처리와 메뉴, admin: 거기에 더해 역할 관리와 삭제)
import { SHOP } from './config.js';
import { store, DEMO, ROLES } from './store.js';
import {
  $, $$, won, esc, timeText, badge, toast, errText, askNotify, notify, beep,
  STATUS, PAYMENT, CATEGORY,
} from './ui.js';

const state = {
  user: null, role: '', orders: [], menu: [], users: [], settings: {},
  filter: 'active', query: '', seen: null, fresh: new Set(),
};
const unsubs = [];
const isAdmin = () => state.role === 'admin';

if (DEMO) $('#banners').innerHTML = `<div class="banner warn">데모 모드예요. <a href="index.html" target="_blank">소비자 화면</a>을 다른 탭에 열고 주문해 보세요.</div>`;

$$('.tab').forEach(t => t.addEventListener('click', () => {
  $$('.tab').forEach(x => x.classList.toggle('active', x === t));
  ['orders', 'menu', 'stats', 'users'].forEach(n => $('#tab-' + n).classList.toggle('hidden', n !== t.dataset.tab));
  if (t.dataset.tab === 'orders') { state.fresh.clear(); renderOrders(); }
}));

/* ---------- 로그인과 권한 ---------- */

store.onAuth(async u => {
  unsubs.splice(0).forEach(fn => fn());
  state.user = u; state.role = ''; state.seen = null;
  $('#outBtn').classList.toggle('hidden', !u);
  if (!u) return showGate('login');
  try { state.role = await store.getRole(u.uid); } catch (e) { console.error(e); }
  if (!ROLES.includes(state.role)) return showGate('denied');
  start();
});
$('#outBtn').onclick = () => store.signOut();

function showGate(kind) {
  $('#app').classList.add('hidden');
  $('#openSwitch').classList.add('hidden');
  $('#who').textContent = '';
  const g = $('#gate');
  g.classList.remove('hidden');
  if (kind === 'login') {
    g.innerHTML = `
      <div class="card narrow">
        <h2>관리자 로그인</h2>
        ${DEMO ? '<button class="btn primary wide" id="demoBtn">데모 관리자로 들어가기</button><div class="or">또는</div>' : ''}
        <button class="btn google wide" id="gBtn">구글 계정으로 로그인</button>
        <form id="lf" class="form">
          <input type="email" name="email" placeholder="이메일" required>
          <input type="password" name="pw" placeholder="비밀번호">
          <button class="btn wide" type="submit">이메일로 로그인</button>
        </form>
      </div>`;
    if (DEMO) $('#demoBtn').onclick = () => store.demoAdminLogin();
    $('#gBtn').onclick = () => store.signInGoogle().catch(e => toast(errText(e), 'error'));
    $('#lf').onsubmit = ev => {
      ev.preventDefault();
      const f = new FormData(ev.target);
      store.signInEmail(f.get('email'), f.get('pw')).catch(e => toast(errText(e), 'error'));
    };
  } else {
    g.innerHTML = `
      <div class="card narrow">
        <h2>관리자 권한이 없어요</h2>
        <p>${esc(state.user.email || '')}</p>
        <p class="muted">관리자에게 아래 사용자 ID를 알려 주고 역할을 받으세요.</p>
        <code class="uid">${esc(state.user.uid)}</code>
        ${DEMO ? '<button class="btn primary wide" id="demoBtn">데모 관리자로 들어가기</button>' : ''}
      </div>`;
    if (DEMO) $('#demoBtn').onclick = () => store.demoAdminLogin();
  }
}

function start() {
  $('#gate').classList.add('hidden');
  $('#app').classList.remove('hidden');
  $('#openSwitch').classList.remove('hidden');
  $('#who').textContent = `${state.user.email || ''} · ${state.role === 'admin' ? '관리자' : '스태프'}`;
  $$('.admin-only').forEach(el => el.classList.toggle('hidden', !isAdmin()));
  askNotify();

  unsubs.push(store.watchAllOrders(onOrders, e => toast('주문을 불러오지 못했어요: ' + errText(e), 'error')));
  unsubs.push(store.watchMenu(list => { state.menu = list; renderMenu(); }));
  unsubs.push(store.watchSettings(s => {
    state.settings = s || {};
    $('#openToggle').checked = (state.settings.open ?? SHOP.defaultOpen) !== false;
    if (document.activeElement !== $('#notice')) $('#notice').value = state.settings.notice || '';
  }));
  if (isAdmin()) unsubs.push(store.watchUsers(list => { state.users = list; renderUsers(); }));
}

$('#openToggle').addEventListener('change', async e => {
  try {
    await store.updateSettings({ open: e.target.checked });
    toast(e.target.checked ? '주문을 받기 시작했어요.' : '주문을 마감했어요.');
  } catch (err) { toast(errText(err), 'error'); }
});
$('#saveNotice').onclick = async () => {
  try { await store.updateSettings({ notice: $('#notice').value.trim() }); toast('공지를 저장했어요.'); }
  catch (e) { toast(errText(e), 'error'); }
};

/* ---------- 주문 ---------- */

function onOrders(list) {
  if (state.seen) {
    const added = list.filter(o => !state.seen.has(o.id));
    if (added.length) {
      added.forEach(o => state.fresh.add(o.id));
      beep();
      notify('새 주문', added.map(o => `#${o.number} ${o.student} ${won(o.total)}`).join('\n'));
    }
  }
  state.seen = new Set(list.map(o => o.id));
  state.orders = list;
  renderOrders();
  renderStats();
}

const FILTERS = [
  ['active', '진행 중', o => !['done', 'cancelled'].includes(o.status)],
  ['pending', '접수됨', o => o.status === 'pending'],
  ['making', '만드는 중', o => o.status === 'making'],
  ['delivering', '배달 중', o => o.status === 'delivering'],
  ['ready', '픽업 대기', o => o.status === 'ready'],
  ['unpaid', '입금 확인 전', o => o.payment === 'transfer' && !o.paid && o.status !== 'cancelled'],
  ['done', '완료', o => o.status === 'done'],
  ['cancelled', '취소', o => o.status === 'cancelled'],
  ['all', '전체', () => true],
];

function renderOrders() {
  $('#filters').innerHTML = FILTERS.map(([key, label, fn]) =>
    `<button class="chip ${state.filter === key ? 'on' : ''}" data-f="${key}">${label} ${state.orders.filter(fn).length}</button>`).join('');

  const fn = FILTERS.find(f => f[0] === state.filter)[2];
  const q = state.query.toLowerCase();
  let list = state.orders.filter(fn);
  if (q) list = list.filter(o => [o.number, o.student, o.location, o.email].join(' ').toLowerCase().includes(q));
  // 진행 중인 주문은 오래된 것부터 (먼저 들어온 주문 먼저 처리)
  if (['active', 'pending', 'making', 'delivering', 'ready'].includes(state.filter)) list = [...list].reverse();

  const nc = $('#newCount');
  nc.textContent = state.fresh.size;
  nc.classList.toggle('hidden', !state.fresh.size);

  if (!list.length) { $('#orderList').innerHTML = '<p class="empty">해당하는 주문이 없어요.</p>'; return; }
  $('#orderList').innerHTML = list.map(orderCard).join('');
}

function orderCard(o) {
  const change = o.payment === 'cash' && o.cashGiven > o.total ? o.cashGiven - o.total : 0;
  const next = {
    pending: [['making', '만들기 시작']],
    making: [['delivering', '배달 출발'], ['ready', '나왔어요 (픽업)']],
    delivering: [['done', '배달 완료']],
    ready: [['done', '전달 완료']],
    done: [], cancelled: [['pending', '다시 접수']],
  }[o.status] || [];
  return `
  <article class="order-card admin-card st-${esc(o.status)} ${state.fresh.has(o.id) ? 'fresh' : ''}" data-id="${esc(o.id)}">
    <header>
      <span class="num big">#${esc(o.number)}</span>${badge(o.status)}
      <span class="time">${timeText(o.createdAt)}</span>
    </header>
    <div class="who"><strong>${esc(o.student)}</strong> · ${esc(o.location)}</div>
    <ul class="items">${(o.items || []).map(i => `<li><b>${esc(i.qty)}</b> ${esc(i.name)}</li>`).join('')}</ul>
    ${o.note ? `<p class="note">${esc(o.note)}</p>` : ''}
    <div class="meta">
      <strong>${won(o.total)}</strong>
      <span>${esc(PAYMENT[o.payment] || o.payment)}</span>
      ${change ? `<span class="warn-text">거스름돈 ${won(change)} (${won(o.cashGiven)} 냄)</span>` : ''}
    </div>
    <div class="actions">
      ${next.map(([s, label]) => `<button class="btn primary small" data-set="${s}">${label}</button>`).join('')}
      ${o.payment === 'transfer' && o.status !== 'cancelled'
        ? `<button class="btn small ${o.paid ? 'good' : ''}" data-paid="${o.paid ? 0 : 1}">${o.paid ? '입금 확인됨' : '입금 확인'}</button>` : ''}
      ${!['done', 'cancelled'].includes(o.status) ? '<button class="btn ghost small" data-set="cancelled">취소</button>' : ''}
      ${isAdmin() ? '<button class="btn ghost small danger" data-del>삭제</button>' : ''}
    </div>
    <div class="sub">${esc(o.email || '')}</div>
  </article>`;
}

$('#filters').addEventListener('click', e => {
  const f = e.target.closest('[data-f]')?.dataset.f;
  if (f) { state.filter = f; renderOrders(); }
});
$('#search').addEventListener('input', e => { state.query = e.target.value.trim(); renderOrders(); });

$('#orderList').addEventListener('click', async e => {
  const card = e.target.closest('.order-card');
  if (!card) return;
  const id = card.dataset.id;
  state.fresh.delete(id);
  const btn = e.target.closest('button');
  if (!btn) return renderOrders();
  try {
    if (btn.dataset.set) {
      if (btn.dataset.set === 'cancelled' && !confirm('이 주문을 취소할까요?')) return;
      btn.disabled = true;
      await store.updateOrder(id, { status: btn.dataset.set });
      toast(`#${state.orders.find(o => o.id === id)?.number} → ${STATUS[btn.dataset.set].label}`);
    } else if (btn.dataset.paid) {
      await store.updateOrder(id, { paid: btn.dataset.paid === '1' });
    } else if ('del' in btn.dataset) {
      if (!confirm('주문을 완전히 지울까요? 되돌릴 수 없어요.')) return;
      await store.deleteOrder(id);
    }
  } catch (err) { toast(errText(err), 'error'); btn.disabled = false; }
});

/* ---------- 메뉴 ---------- */

$('#addMenu').onsubmit = async ev => {
  ev.preventDefault();
  const f = new FormData(ev.target);
  try {
    await store.addMenu({
      name: f.get('name').trim(), price: Number(f.get('price')) || 0, category: f.get('category'),
      description: f.get('description').trim(), imageUrl: f.get('imageUrl').trim(),
    });
    ev.target.reset();
    toast('메뉴를 추가했어요.');
  } catch (e) { toast(errText(e), 'error'); }
};

function renderMenu() {
  if (!state.menu.length) { $('#menuAdmin').innerHTML = '<p class="empty">메뉴가 없어요. 위에서 추가하세요.</p>'; return; }
  $('#menuAdmin').innerHTML = state.menu.map((m, i) => `
    <div class="card menu-row ${m.soldOut ? 'sold' : ''}" data-id="${esc(m.id)}">
      <div class="order-btns">
        <button class="btn ghost small" data-move="-1" ${i === 0 ? 'disabled' : ''} aria-label="위로">▲</button>
        <button class="btn ghost small" data-move="1" ${i === state.menu.length - 1 ? 'disabled' : ''} aria-label="아래로">▼</button>
      </div>
      <input data-k="name" value="${esc(m.name)}" aria-label="이름">
      <input data-k="price" type="number" min="0" step="100" value="${esc(m.price)}" aria-label="가격">
      <select data-k="category" aria-label="분류">
        ${Object.entries(CATEGORY).map(([k, v]) => `<option value="${k}" ${m.category === k ? 'selected' : ''}>${v}</option>`).join('')}
      </select>
      <input data-k="description" value="${esc(m.description || '')}" placeholder="설명" aria-label="설명">
      <input data-k="imageUrl" value="${esc(m.imageUrl || '')}" placeholder="사진 주소" aria-label="사진 주소">
      <button class="btn small ${m.soldOut ? 'primary' : ''}" data-sold>${m.soldOut ? '판매 재개' : '품절'}</button>
      <button class="btn ghost small danger" data-delmenu>삭제</button>
    </div>`).join('');
}

// 값을 고치고 칸을 벗어나면 바로 저장
$('#menuAdmin').addEventListener('change', async e => {
  const k = e.target.dataset.k;
  if (!k) return;
  const id = e.target.closest('.menu-row').dataset.id;
  const v = k === 'price' ? Number(e.target.value) || 0 : e.target.value.trim();
  try { await store.updateMenu(id, { [k]: v }); toast('저장했어요.'); } catch (err) { toast(errText(err), 'error'); }
});
$('#menuAdmin').addEventListener('click', async e => {
  const btn = e.target.closest('button');
  if (!btn) return;
  const id = btn.closest('.menu-row').dataset.id;
  const idx = state.menu.findIndex(m => m.id === id);
  const m = state.menu[idx];
  try {
    if ('sold' in btn.dataset) {
      await store.updateMenu(id, { soldOut: !m.soldOut });
      toast(m.soldOut ? `${m.name} 판매를 다시 시작했어요.` : `${m.name} 품절 처리했어요.`);
    } else if ('delmenu' in btn.dataset) {
      if (confirm(`'${m.name}' 메뉴를 지울까요?`)) await store.deleteMenu(id);
    } else if (btn.dataset.move) {
      const other = state.menu[idx + Number(btn.dataset.move)];
      if (!other) return;
      // 두 메뉴의 순서 값을 맞바꾼다
      await Promise.all([store.updateMenu(id, { order: other.order }), store.updateMenu(other.id, { order: m.order })]);
    }
  } catch (err) { toast(errText(err), 'error'); }
});

/* ---------- 매출 ---------- */

function renderStats() {
  const valid = state.orders.filter(o => o.status !== 'cancelled');
  const sum = l => l.reduce((s, o) => s + (Number(o.total) || 0), 0);
  const transfer = valid.filter(o => o.payment === 'transfer');
  const unpaid = transfer.filter(o => !o.paid);
  const byItem = {};
  valid.forEach(o => (o.items || []).forEach(i => {
    const r = (byItem[i.name] ||= { qty: 0, amount: 0 });
    r.qty += Number(i.qty) || 0;
    r.amount += (Number(i.qty) || 0) * (Number(i.price) || 0);
  }));
  const rows = Object.entries(byItem).sort((a, b) => b[1].amount - a[1].amount);
  $('#stats').innerHTML = `
    <div class="stat-grid">
      <div class="stat"><span>주문 수</span><strong>${valid.length}건</strong></div>
      <div class="stat"><span>총 매출</span><strong>${won(sum(valid))}</strong></div>
      <div class="stat"><span>현금</span><strong>${won(sum(valid.filter(o => o.payment === 'cash')))}</strong></div>
      <div class="stat"><span>계좌이체</span><strong>${won(sum(transfer))}</strong></div>
      <div class="stat warn"><span>입금 확인 전</span><strong>${won(sum(unpaid))} (${unpaid.length}건)</strong></div>
      <div class="stat"><span>취소</span><strong>${state.orders.length - valid.length}건</strong></div>
    </div>
    <table class="table">
      <thead><tr><th>메뉴</th><th>수량</th><th>금액</th></tr></thead>
      <tbody>${rows.map(([n, r]) => `<tr><td>${esc(n)}</td><td>${r.qty}</td><td>${won(r.amount)}</td></tr>`).join('') || '<tr><td colspan="3">아직 없음</td></tr>'}</tbody>
    </table>`;
}

$('#csvBtn').onclick = () => {
  const head = ['번호', '시간', '상태', '학년반이름', '위치', '메뉴', '총액', '결제', '입금확인', '낸 금액', '요청사항', '이메일'];
  const cell = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [...state.orders].reverse().map(o => [
    o.number, new Date(o.createdAt).toLocaleString('ko-KR'), STATUS[o.status]?.label || o.status, o.student, o.location,
    (o.items || []).map(i => `${i.name} x${i.qty}`).join(', '), o.total, PAYMENT[o.payment] || o.payment,
    o.payment === 'transfer' ? (o.paid ? 'O' : 'X') : '', o.cashGiven || '', o.note, o.email,
  ].map(cell).join(','));
  const blob = new Blob(['\uFEFF' + [head.map(cell).join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `펀드주문_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
};

/* ---------- 사용자 역할 (admin만) ---------- */

$('#userSearch').addEventListener('input', renderUsers);
function renderUsers() {
  const q = $('#userSearch').value.trim().toLowerCase();
  const list = state.users.filter(u => !q || [u.email, u.name, u.student].join(' ').toLowerCase().includes(q));
  $('#userList').innerHTML = list.map(u => `
    <div class="card user-row" data-uid="${esc(u.uid)}">
      <div><strong>${esc(u.email || '(이메일 없음)')}</strong><div class="sub">${esc(u.student || u.name || '')}</div></div>
      <select data-role ${u.uid === state.user.uid ? 'disabled title="내 역할은 바꿀 수 없어요"' : ''}>
        <option value="" ${!u.role ? 'selected' : ''}>일반</option>
        <option value="staff" ${u.role === 'staff' ? 'selected' : ''}>스태프 (주문 처리)</option>
        <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>관리자</option>
      </select>
    </div>`).join('') || '<p class="empty">사용자가 없어요.</p>';
}
$('#userList').addEventListener('change', async e => {
  if (!('role' in e.target.dataset)) return;
  const uid = e.target.closest('.user-row').dataset.uid;
  try { await store.setRole(uid, e.target.value); toast('역할을 바꿨어요.'); } catch (err) { toast(errText(err), 'error'); }
});
