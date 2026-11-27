// 펀드 페이지와 개발자 페이지가 같이 쓰는 화면 조각 (주문판, 메뉴 관리, 매출, 운영 설정)
// 페이지는 따로지만 기능 코드는 한 곳에서 고치도록 여기 모았다.
import { SHOP } from './config.js';
import { store } from './store.js';
import { MENU_IMAGES, menuImage } from './menu-images.js';
import { $, $$, won, esc, forgotHelp, openModal, closeModal, timeText, badge, toast, errText, notify, beep, STATUS, PAYMENT, WALKUP_PAY, CATEGORY, DAYS } from './ui.js';

/* ---------- 로그인 화면 (펀드/개발자 공통) ---------- */

export function loginGate(root, { title, demoButton }) {
  root.innerHTML = `
    <div class="card narrow">
      <div class="gate-logo" aria-label="로고 자리">로고<br>자리</div>
      <h2>${esc(title)}</h2>
      ${demoButton ? `<button class="btn primary wide" id="demoBtn">${esc(demoButton.label)}</button><div class="or">또는</div>` : ''}
      <button class="btn google wide" id="gBtn">구글 계정으로 로그인</button>
      <form id="lf" class="form">
        <input type="email" name="email" placeholder="학교 메일 (아이디@his.sc.kr)" required>
        <input type="password" name="pw" placeholder="비밀번호">
        <button class="btn wide" type="submit">이메일로 로그인</button>
      </form>
      ${forgotHelp()}
      <p class="muted small-note">로그인하면 이메일과 접속 시간이 기록돼요.</p>
    </div>`;
  if (demoButton) $('#demoBtn', root).onclick = demoButton.onClick;
  $('#gBtn', root).onclick = () => store.signInGoogle().catch(e => toast(errText(e), 'error'));
  $('#lf', root).onsubmit = ev => {
    ev.preventDefault();
    const f = new FormData(ev.target);
    store.signInEmail(f.get('email'), f.get('pw')).catch(e => toast(errText(e), 'error'));
  };
}

export function deniedGate(root, user, { message, demoButton }) {
  root.innerHTML = `
    <div class="card narrow">
      <h2>권한이 없어요</h2>
      <p>${esc(user.email || '')}</p>
      <p class="muted">${esc(message)}</p>
      <code class="uid">${esc(user.uid)}</code>
      ${demoButton ? `<button class="btn primary wide" id="demoBtn">${esc(demoButton.label)}</button>` : ''}
      <button class="btn ghost wide" id="outBtn2">다른 계정으로 로그인</button>
    </div>`;
  if (demoButton) $('#demoBtn', root).onclick = demoButton.onClick;
  $('#outBtn2', root).onclick = () => store.signOut();
}

/* ---------- 주문판 ---------- */

const FILTERS = [
  ['active', '진행 중', o => !['done', 'cancelled'].includes(o.status)],
  ['pending', '접수됨', o => o.status === 'pending'],
  ['making', '만드는 중', o => o.status === 'making'],
  ['delivering', '배달 중', o => o.status === 'delivering'],
  ['ready', '픽업 대기', o => o.status === 'ready'],
  ['unpaid', '받을 돈', o => ['transfer', 'credit'].includes(o.payment) && !o.paid && o.status !== 'cancelled'],
  ['done', '완료', o => o.status === 'done'],
  ['cancelled', '취소', o => o.status === 'cancelled'],
  ['all', '전체', () => true],
];
const NEXT = {
  pending: [['making', '만들기 시작']],
  making: [['delivering', '배달 출발'], ['ready', '나왔어요 (픽업)']],
  delivering: [['done', '배달 완료']],
  ready: [['done', '전달 완료']],
  done: [], cancelled: [['pending', '다시 접수']],
};

// dev: true면 아무 상태로나 바꾸기, 주문 삭제가 추가된다
export function mountOrders(root, { dev = false, onNewCount, onOrders } = {}) {
  root.innerHTML = `
    <div class="open-bar" data-r="open"></div>
    <div class="prep" data-r="prep"></div>
    <div class="toolbar">
      <div class="chips" data-r="filters"></div>
      <input type="search" data-r="search" placeholder="번호, 이름, 위치, 이메일 검색">
    </div>
    <div class="order-board" data-r="list"></div>`;
  const st = { orders: [], filter: 'active', query: '', seen: null, fresh: new Set() };
  const R = n => $(`[data-r=${n}]`, root);

  // 접수됨·만드는 중 주문의 메뉴를 다 더해서 "지금 만들 것"을 보여 준다
  function renderPrep() {
    const sum = {};
    st.orders.filter(o => ['pending', 'making'].includes(o.status))
      .forEach(o => (o.items || []).forEach(i => { sum[i.name] = (sum[i.name] || 0) + (Number(i.qty) || 0); }));
    const list = Object.entries(sum).sort((a, b) => b[1] - a[1]);
    R('prep').innerHTML = list.length
      ? `<span class="prep-label">지금 만들 것</span>${list.map(([n, q]) => `<span class="prep-item"><b>${q}</b> ${esc(n)}</span>`).join('')}`
      : '';
  }
  // 들어온 지 몇 분 됐는지 (진행 중인 주문만)
  function ageTag(o) {
    if (['done', 'cancelled'].includes(o.status) || !o.createdAt) return '';
    const min = Math.floor((Date.now() - o.createdAt) / 60000);
    const cls = min >= 25 ? 'age late' : min >= 15 ? 'age slow' : 'age';
    return `<span class="${cls}">${min < 1 ? '방금' : min + '분째'}</span>`;
  }

  function card(o) {
    const change = o.payment === 'cash' && o.cashGiven > o.total ? o.cashGiven - o.total : 0;
    return `
    <article class="order-card ticket-card admin-card st-${esc(o.status)} ${st.fresh.has(o.id) ? 'fresh' : ''}" data-id="${esc(o.id)}">
      <div class="stub">
        <span class="stub-num">${esc(o.number)}</span>
        ${ageTag(o)}
      </div>
      <div class="ticket-main">
        <header>${badge(o.status)}${o.source === 'walkup' ? '<span class="badge badge-blue">현장</span>' : ''}${o.pickup ? '<span class="badge badge-purple">픽업</span>' : ''}<span class="time">${timeText(o.createdAt)}</span></header>
        <div class="who"><strong>${esc(o.student)}</strong>${o.pickup ? '' : `<span class="where">${esc(o.location)}</span>`}</div>
        <ul class="items">${(o.items || []).map(i => `<li><span>${esc(i.name)}</span><b>${esc(i.qty)}</b></li>`).join('')}</ul>
        ${o.note ? `<p class="note">${esc(o.note)}</p>` : ''}
        <div class="meta">
          <span>${esc(PAYMENT[o.payment] || o.payment)}</span>
          ${change ? `<span class="warn-text">거스름돈 ${won(change)} (${won(o.cashGiven)} 냄)</span>` : ''}
          <strong>${won(o.total)}</strong>
        </div>
        <div class="actions">
          ${(NEXT[o.status] || []).filter(([s]) => o.source === 'walkup' ? true : !(o.pickup && s === 'delivering') && !(o.pickup === false && s === 'ready')).map(([s, label]) => `<button class="btn primary small" data-set="${s}">${label}</button>`).join('')}
          ${o.payment === 'transfer' && o.status !== 'cancelled'
            ? `<button class="btn small ${o.paid ? 'good' : ''}" data-paid="${o.paid ? 0 : 1}">${o.paid ? '입금 확인됨' : '입금 확인'}</button>` : ''}
          ${o.payment === 'credit' && o.status !== 'cancelled'
            ? `<button class="btn small ${o.paid ? 'good' : ''}" data-paid="${o.paid ? 0 : 1}">${o.paid ? '외상 받음' : '외상 받기'}</button>` : ''}
          ${!['done', 'cancelled'].includes(o.status) ? '<button class="btn ghost small" data-set="cancelled">취소</button>' : ''}
          ${dev ? `<select class="small-select" data-force aria-label="상태 강제 변경">
              <option value="">상태 강제 변경</option>
              ${Object.entries(STATUS).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('')}
            </select>
            <button class="btn ghost small danger" data-del>삭제</button>` : ''}
        </div>
        ${o.email ? `<div class="sub">${esc(o.email)}</div>` : ''}
      </div>
    </article>`;
  }

  function render() {
    R('filters').innerHTML = FILTERS.map(([key, label, fn]) =>
      `<button class="chip ${st.filter === key ? 'on' : ''}" data-f="${key}">${label} ${st.orders.filter(fn).length}</button>`).join('');
    const fn = FILTERS.find(f => f[0] === st.filter)[2];
    const q = st.query.toLowerCase();
    let list = st.orders.filter(fn);
    if (q) list = list.filter(o => [o.number, o.student, o.location, o.email].join(' ').toLowerCase().includes(q));
    // 진행 중인 주문은 먼저 들어온 것부터
    if (['active', 'pending', 'making', 'delivering', 'ready'].includes(st.filter)) list = [...list].reverse();
    R('list').innerHTML = list.length ? list.map(card).join('') : '<p class="empty">해당하는 주문이 없어요.</p>';
    renderPrep();
    if (onNewCount) onNewCount(st.fresh.size);
  }

  R('filters').addEventListener('click', e => {
    const f = e.target.closest('[data-f]')?.dataset.f;
    if (f) { st.filter = f; render(); }
  });
  R('search').addEventListener('input', e => { st.query = e.target.value.trim(); render(); });

  R('list').addEventListener('change', async e => {
    if (!('force' in e.target.dataset) || !e.target.value) return;
    const id = e.target.closest('.order-card').dataset.id;
    try { await store.updateOrder(id, { status: e.target.value }); toast('상태를 바꿨어요.'); } catch (err) { toast(errText(err), 'error'); }
  });
  R('list').addEventListener('click', async e => {
    const cardEl = e.target.closest('.order-card');
    if (!cardEl) return;
    const id = cardEl.dataset.id;
    st.fresh.delete(id);
    const btn = e.target.closest('button');
    if (!btn) { if (e.target.tagName !== 'SELECT') render(); return; }
    try {
      if (btn.dataset.set) {
        if (btn.dataset.set === 'cancelled' && !confirm('이 주문을 취소할까요?')) return;
        btn.disabled = true;
        await store.updateOrder(id, { status: btn.dataset.set });
        const num = st.orders.find(o => o.id === id)?.number;
        toast(`#${num} ${STATUS[btn.dataset.set].label}`);
        // 픽업 주문이 나오면 학생 화면 위쪽에 "방금 나온 번호"로 띄운다
        if (btn.dataset.set === 'ready' && num) {
          store.updateSettings({ ready: [num, ...(lastReady || []).filter(n => n !== num)].slice(0, 6), readyAt: Date.now() }).catch(() => {});
        }
      } else if (btn.dataset.paid) {
        await store.updateOrder(id, { paid: btn.dataset.paid === '1' });
      } else if ('del' in btn.dataset) {
        if (!confirm('주문을 완전히 지울까요? 되돌릴 수 없어요.')) return;
        await store.deleteOrder(id);
      }
    } catch (err) { toast(errText(err), 'error'); btn.disabled = false; }
  });

  // 주문 받기 스위치: 주문판 맨 위에서 바로 켜고 끈다
  let open = true;
  const renderOpen = () => {
    R('open').className = 'open-bar ' + (open ? 'on' : 'off');
    R('open').innerHTML = `<span>${open ? '학생 주문을 받는 중이에요' : '학생 주문이 막혀 있어요'}</span>
      <button class="btn small" data-toggle-open>${open ? '주문 마감하기' : '주문 다시 받기'}</button>`;
  };
  let lastReady = [];
  const unsubSettings = store.watchSettings(s => { open = (s && s.open) ?? SHOP.defaultOpen; open = open !== false; lastReady = (s && s.ready) || []; renderOpen(); });
  const ageTimer = setInterval(() => render(), 30000); // 경과 시간 갱신
  R('open').addEventListener('click', async e => {
    if (!e.target.closest('[data-toggle-open]')) return;
    if (open && !confirm('학생 주문을 마감할까요? 현장 주문 기록은 계속 할 수 있어요.')) return;
    try { await store.updateSettings({ open: !open }); toast(open ? '주문을 마감했어요.' : '주문을 다시 받아요.'); } catch (err) { toast(errText(err), 'error'); }
  });

  const unsubOrders = store.watchAllOrders(list => {
    if (st.seen) {
      const added = list.filter(o => !st.seen.has(o.id));
      if (added.length) {
        added.forEach(o => st.fresh.add(o.id));
        beep();
        notify('새 주문', added.map(o => `#${o.number} ${o.student} ${won(o.total)}`).join('\n'));
      }
    }
    st.seen = new Set(list.map(o => o.id));
    st.orders = list;
    render();
    if (onOrders) onOrders(list);
  }, e => toast('주문을 불러오지 못했어요: ' + errText(e), 'error'));

  const unsub = () => { unsubOrders(); unsubSettings && unsubSettings(); clearInterval(ageTimer); };
  return { unsub, clearFresh() { st.fresh.clear(); render(); }, get orders() { return st.orders; } };
}

/* ---------- 메뉴 관리 ---------- */

export function mountMenu(root) {
  root.innerHTML = `
    <form class="card form inline" data-r="add">
      <h3>메뉴 추가</h3>
      <input name="name" placeholder="이름" required>
      <input name="price" type="number" min="0" step="100" placeholder="가격" required>
      <select name="category"><option value="food">음식</option><option value="drink">음료</option></select>
      <input name="description" placeholder="설명 (선택)">
      <input name="imageUrl" type="hidden">
      <button type="button" class="pic-pick" data-r="addPic" aria-label="사진 고르기"><img src="images/menu/food/default.svg" alt=""><span>사진 고르기</span></button>
      <button class="btn primary" type="submit">추가</button>
    </form>
    <details class="card bulk">
      <summary>여러 개 한꺼번에 넣기</summary>
      <p class="muted">한 줄에 하나씩 <b>이름, 가격, 분류</b> 순서로 적어요. 분류는 음식 또는 음료이고, 안 적으면 음식이에요.</p>
      <textarea data-r="bulk" rows="6" placeholder="붕어빵 (팥), 1000, 음식&#10;아이스티, 1500, 음료"></textarea>
      <button class="btn primary" data-r="bulkGo">한꺼번에 추가</button>
    </details>
    <div data-r="list"></div>`;
  let menu = [];
  $('[data-r=bulkGo]', root).onclick = async () => {
    const lines = $('[data-r=bulk]', root).value.split('\n').map(l => l.trim()).filter(Boolean);
    const items = [], bad = [];
    lines.forEach((l, i) => {
      // "2,000원"처럼 가격 안에 쉼표가 있어도 되게: 첫 칸은 이름, 마지막 칸이 음식/음료면 분류, 나머지는 가격
      const parts = l.split(/[,\t]/).map(x => x.trim());
      const name = parts.shift();
      const cat = /^(음식|음료|food|drink)$/i.test(parts[parts.length - 1] || '') ? parts.pop() : '';
      const n = Number(parts.join('').replace(/[^0-9]/g, ''));
      if (!name || !n) bad.push(i + 1);
      else items.push({ name, price: n, category: /음료|drink/i.test(cat || '') ? 'drink' : 'food', description: '', imageUrl: '' });
    });
    if (bad.length) return toast(`${bad.join(', ')}번째 줄을 확인해 주세요. (이름, 가격)`, 'error');
    if (!items.length) return toast('넣을 메뉴가 없어요.', 'error');
    try {
      for (const it of items) await store.addMenu(it);
      $('[data-r=bulk]', root).value = '';
      toast(`메뉴 ${items.length}개를 추가했어요.`, 'good');
    } catch (e) { toast(errText(e), 'error'); }
  };
  const list = $('[data-r=list]', root);

  // 사진 고르기 창: 기본 그림 목록 + 이름으로 자동 + 직접 주소
  function pickImage(current, onPick) {
    const m = openModal(`
      <h2>사진 고르기</h2>
      <p class="muted">그림을 누르면 바로 들어가요. "자동"은 메뉴 이름에 맞는 그림을 알아서 붙여요.</p>
      <div class="pic-grid">
        <button class="pic-opt ${!current ? 'on' : ''}" data-pic=""><span class="pic-auto">자동</span><small>이름으로 찾기</small></button>
        ${MENU_IMAGES.map(i => `<button class="pic-opt ${current === i.path ? 'on' : ''}" data-pic="${esc(i.path)}"><img src="${esc(i.path)}" alt=""><small>${esc(i.name)}</small></button>`).join('')}
      </div>
      <label class="pic-url">직접 주소 넣기 (사진 파일 주소나 images/menu/... 경로)
        <div class="row"><input data-r="url" value="${esc(current && !MENU_IMAGES.some(i => i.path === current) ? current : '')}" placeholder="https://... 또는 images/menu/food/내사진.png"><button class="btn" data-r="useUrl">넣기</button></div>
      </label>
      <button class="btn ghost wide" data-r="close">닫기</button>`);
    m.addEventListener('click', e => {
      const opt = e.target.closest('[data-pic]');
      if (opt) { onPick(opt.dataset.pic); closeModal(); return; }
      if (e.target.closest('[data-r=useUrl]')) { onPick($('[data-r=url]', m).value.trim()); closeModal(); return; }
      if (e.target.closest('[data-r=close]')) closeModal();
    });
  }
  const addForm = $('[data-r=add]', root);
  const syncAddPic = () => {
    const f = new FormData(addForm);
    $('[data-r=addPic] img', root).src = menuImage({ imageUrl: f.get('imageUrl'), name: f.get('name'), category: f.get('category') });
  };
  addForm.addEventListener('input', syncAddPic);
  addForm.addEventListener('change', syncAddPic);
  $('[data-r=addPic]', root).onclick = () => pickImage(addForm.imageUrl.value, v => { addForm.imageUrl.value = v; syncAddPic(); });

  $('[data-r=add]', root).onsubmit = async ev => {
    ev.preventDefault();
    const f = new FormData(ev.target);
    try {
      await store.addMenu({
        name: f.get('name').trim(), price: Number(f.get('price')) || 0, category: f.get('category'),
        description: f.get('description').trim(), imageUrl: f.get('imageUrl').trim(),
      });
      ev.target.reset(); syncAddPic();
      toast('메뉴를 추가했어요.');
    } catch (e) { toast(errText(e), 'error'); }
  };

  function render() {
    if (!menu.length) { list.innerHTML = '<p class="empty">메뉴가 없어요. 위에서 추가하세요.</p>'; return; }
    list.innerHTML = menu.map((m, i) => `
      <div class="card menu-row ${m.soldOut ? 'sold' : ''}" data-id="${esc(m.id)}">
        <div class="order-btns">
          <button class="btn ghost small" data-move="-1" ${i === 0 ? 'disabled' : ''} aria-label="위로">▲</button>
          <button class="btn ghost small" data-move="1" ${i === menu.length - 1 ? 'disabled' : ''} aria-label="아래로">▼</button>
        </div>
        <button type="button" class="pic-pick small" data-pic-for="${esc(m.id)}" title="사진 바꾸기"><img src="${esc(menuImage(m))}" alt="${esc(m.name)} 사진"></button>
        <input data-k="name" value="${esc(m.name)}" aria-label="이름">
        <input data-k="price" type="number" min="0" step="100" value="${esc(m.price)}" aria-label="가격">
        <select data-k="category" aria-label="분류">
          ${Object.entries(CATEGORY).map(([k, v]) => `<option value="${k}" ${m.category === k ? 'selected' : ''}>${v}</option>`).join('')}
        </select>
        <input data-k="description" value="${esc(m.description || '')}" placeholder="설명" aria-label="설명">
        <button class="btn small ${m.soldOut ? 'primary' : ''}" data-sold>${m.soldOut ? '판매 재개' : '품절'}</button>
        <button class="btn ghost small danger" data-delmenu>삭제</button>
      </div>`).join('');
  }

  list.addEventListener('change', async e => {
    const k = e.target.dataset.k;
    if (!k) return;
    const id = e.target.closest('.menu-row').dataset.id;
    const v = k === 'price' ? Number(e.target.value) || 0 : e.target.value.trim();
    try { await store.updateMenu(id, { [k]: v }); toast('저장했어요.'); } catch (err) { toast(errText(err), 'error'); }
  });
  list.addEventListener('click', async e => {
    const btn = e.target.closest('button');
    if (!btn) return;
    if (btn.dataset.picFor) {
      const item = menu.find(x => x.id === btn.dataset.picFor);
      return pickImage(item.imageUrl || '', async v => {
        try { await store.updateMenu(item.id, { imageUrl: v }); toast('사진을 바꿨어요.'); } catch (err) { toast(errText(err), 'error'); }
      });
    }
    const id = btn.closest('.menu-row').dataset.id;
    const idx = menu.findIndex(m => m.id === id);
    const m = menu[idx];
    try {
      if ('sold' in btn.dataset) {
        await store.updateMenu(id, { soldOut: !m.soldOut });
        toast(m.soldOut ? `${m.name} 판매를 다시 시작했어요.` : `${m.name} 품절 처리했어요.`);
      } else if ('delmenu' in btn.dataset) {
        if (confirm(`'${m.name}' 메뉴를 지울까요?`)) await store.deleteMenu(id);
      } else if (btn.dataset.move) {
        const other = menu[idx + Number(btn.dataset.move)];
        if (!other) return;
        await Promise.all([store.updateMenu(id, { order: other.order }), store.updateMenu(other.id, { order: m.order })]);
      }
    } catch (err) { toast(errText(err), 'error'); }
  });

  const unsub = store.watchMenu(l => { menu = l; render(); });
  return { unsub };
}

/* ---------- 매출 ---------- */

export function renderStats(root, orders) {
  const valid = orders.filter(o => o.status !== 'cancelled');
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
  root.innerHTML = `
    <div class="stat-grid">
      <div class="stat"><span>주문 수</span><strong>${valid.length}건</strong></div>
      <div class="stat"><span>총 매출</span><strong>${won(sum(valid))}</strong></div>
      <div class="stat"><span>현금</span><strong>${won(sum(valid.filter(o => o.payment === 'cash')))}</strong></div>
      <div class="stat"><span>계좌이체</span><strong>${won(sum(transfer))}</strong></div>
      <div class="stat warn"><span>외상 받을 돈</span><strong>${won(sum(valid.filter(o => o.payment === 'credit' && !o.paid)))} (${valid.filter(o => o.payment === 'credit' && !o.paid).length}건)</strong></div>
      <div class="stat warn"><span>입금 확인 전</span><strong>${won(sum(unpaid))} (${unpaid.length}건)</strong></div>
      <div class="stat"><span>취소</span><strong>${orders.length - valid.length}건</strong></div>
    </div>
    <table class="table">
      <thead><tr><th>메뉴</th><th>수량</th><th>금액</th></tr></thead>
      <tbody>${rows.map(([n, r]) => `<tr><td>${esc(n)}</td><td>${r.qty}</td><td>${won(r.amount)}</td></tr>`).join('') || '<tr><td colspan="3">아직 없음</td></tr>'}</tbody>
    </table>
    <button class="btn" data-r="csv">주문 전체 CSV로 받기</button>`;
  $('[data-r=csv]', root).onclick = () => downloadCsv(`펀드주문_${today()}.csv`,
    ['번호', '시간', '상태', '학년반이름', '위치', '메뉴', '총액', '결제', '입금확인', '낸 금액', '요청사항', '이메일'],
    [...orders].reverse().map(o => [
      o.number, new Date(o.createdAt).toLocaleString('ko-KR'), STATUS[o.status]?.label || o.status, o.student, o.location,
      (o.items || []).map(i => `${i.name} x${i.qty}`).join(', '), o.total, PAYMENT[o.payment] || o.payment,
      ['transfer', 'credit'].includes(o.payment) ? (o.paid ? 'O' : 'X') : '', o.cashGiven || '', o.note, o.email,
    ]));
}

/* ---------- 운영 설정 (주문 받기, 공지) ---------- */

export function mountSettings(root) {
  root.innerHTML = `
    <div class="card form">
      <h3>운영</h3>
      <label class="radio"><input type="checkbox" data-r="open"> 주문 받기 (끄면 학생 화면에서 주문 버튼이 막혀요)</label>
      <label>공지 (학생 화면 위쪽에 보여요)<textarea data-r="notice" rows="2"></textarea></label>
      <button class="btn" data-r="save">공지 저장</button>
    </div>`;
  const open = $('[data-r=open]', root), notice = $('[data-r=notice]', root);
  open.onchange = async () => {
    try { await store.updateSettings({ open: open.checked }); toast(open.checked ? '주문을 받기 시작했어요.' : '주문을 마감했어요.'); }
    catch (e) { toast(errText(e), 'error'); }
  };
  $('[data-r=save]', root).onclick = async () => {
    try { await store.updateSettings({ notice: notice.value.trim() }); toast('공지를 저장했어요.'); } catch (e) { toast(errText(e), 'error'); }
  };
  const unsub = store.watchSettings(s => {
    open.checked = ((s || {}).open ?? SHOP.defaultOpen) !== false;
    if (document.activeElement !== notice) notice.value = (s || {}).notice || '';
  });
  return { unsub };
}

/* ---------- 현장 주문 기록 ---------- */

// 부스 앞에서 받은 주문을 스프레드시트처럼 줄줄이 적는 기록지.
// 한 줄 = 주문 하나. "기록하기"를 누르면 다 채운 줄이 온라인 주문과 같은 orders에 저장돼서
// 주문판·회계·매출에 똑같이 들어간다. 계좌는 bankInfo가 있어도 현장에서는 늘 고를 수 있다.
export function mountWalkup(root) {
  const EMPTY_PEOPLE = 6;      // 처음에 비워 둘 사람 수
  const payOpts = WALKUP_PAY;  // 현장은 현금·계좌·외상 셋 다
  let menu = [];
  // 한 줄 = 메뉴 하나. 같은 group 줄들이 한 사람(주문 하나)이다.
  let rows = [];               // { id, group, student, item, qty, price, pay, day, saved, number }
  let seq = 0, gseq = 0;
  const R = n => $(`[data-r=${n}]`, root);
  const newRow = (lead) => ({
    id: 'r' + (++seq), group: lead ? lead.group : 'g' + (++gseq),
    student: lead ? lead.student : '', item: '', qty: 1, price: 0,
    pay: lead ? lead.pay : 'credit', day: lead ? lead.day : '', saved: false,
  });
  const menuById = id => menu.find(m => m.id === id);
  const groupRows = g => rows.filter(r => r.group === g);
  const isLead = r => groupRows(r.group)[0] === r;

  root.innerHTML = `
    <div class="card sheet-card">
      <div class="sheet-head">
        <div><h3>현장 주문 기록지</h3><p class="muted">한 사람이 여러 개를 시키면 그 사람 줄의 "+ 메뉴"를 눌러 바로 아래에 이어 적어요. 묶인 줄은 주문 하나(번호 하나)로 기록돼요.</p></div>
        <div class="sheet-count" data-r="count"></div>
      </div>
      <div class="sheet-wrap">
        <table class="sheet">
          <thead><tr>
            <th class="c-no">#</th><th class="c-name">이름 학년반</th><th class="c-item">물품</th>
            <th class="c-qty">수량</th><th class="c-price">가격</th><th class="c-pay">결제</th>
            <th class="c-day">요일</th><th class="c-del"></th>
          </tr></thead>
          <tbody data-r="rows"></tbody>
        </table>
      </div>
      <div class="sheet-actions">
        <button class="btn" data-r="add">+ 다른 사람</button>
        <div class="sheet-total">기록 대기 합계 <strong data-r="total">0원</strong></div>
        <button class="btn primary" data-r="save">기록하기</button>
      </div>
    </div>`;

  function itemCell(r) {
    return `<select data-c="item" ${r.saved ? 'disabled' : ''}>
      <option value="">선택</option>
      ${menu.map(m => `<option value="${esc(m.id)}" ${r.item === m.id ? 'selected' : ''}>${esc(m.name)}${m.soldOut ? ' (품절)' : ''}</option>`).join('')}
    </select>`;
  }
  function payCell(r) {
    return `<select data-c="pay" class="pay-sel pay-${esc(r.pay)}" ${r.saved ? 'disabled' : ''}>
      ${payOpts.map(([k, label]) => `<option value="${k}" ${r.pay === k ? 'selected' : ''}>${label}</option>`).join('')}
    </select>`;
  }
  function dayCell(r) {
    return `<select data-c="day" ${r.saved ? 'disabled' : ''}>
      <option value="">-</option>
      ${DAYS.map(d => `<option value="${d}" ${r.day === d ? 'selected' : ''}>${d}</option>`).join('')}
    </select>`;
  }
  const pendingTotal = () => rows.filter(x => !x.saved).reduce((s, x) => s + (Number(x.price) || 0), 0);

  function render() {
    let person = 0, lastGroup = null, odd = false;
    R('rows').innerHTML = rows.map(r => {
      const lead = r.group !== lastGroup;
      if (lead) { person++; odd = !odd; lastGroup = r.group; }
      const g = groupRows(r.group);
      const last = g[g.length - 1] === r;
      const cls = [r.saved ? 'saved' : '', lead ? 'lead' : 'cont', last ? 'last' : '', odd ? 'g-odd' : 'g-even'].join(' ');
      const groupTotal = g.reduce((s, x) => s + (Number(x.price) || 0), 0);
      return `
      <tr data-id="${r.id}" class="${cls}">
        <td class="c-no">${lead ? (r.saved ? `#${r.number}` : person) : ''}</td>
        <td class="c-name">${lead
          ? `<div class="name-cell"><input data-c="student" value="${esc(r.student)}" placeholder="${esc(SHOP.studentHint)}" ${r.saved ? 'disabled' : ''}>
              ${r.saved ? '' : '<button class="more-btn" data-more title="이 사람 메뉴 하나 더">+ 메뉴</button>'}</div>`
          : `<span class="same-person">〃 같은 사람</span>`}</td>
        <td>${itemCell(r)}</td>
        <td><input type="number" data-c="qty" min="1" value="${esc(r.qty)}" ${r.saved ? 'disabled' : ''}></td>
        <td><input type="number" data-c="price" min="0" step="100" value="${esc(r.price)}" ${r.saved ? 'disabled' : ''}></td>
        <td>${lead ? payCell(r) : '<span class="same-person">〃</span>'}</td>
        <td>${lead ? dayCell(r) : '<span class="same-person">〃</span>'}</td>
        <td class="c-del">${r.saved ? (lead ? '<span class="saved-tag">기록됨</span>' : '') : `<button class="row-del" data-del aria-label="줄 지우기">×</button>`}</td>
      </tr>
      ${last && g.length > 1 ? `<tr class="group-sum ${odd ? 'g-odd' : 'g-even'} ${r.saved ? 'saved' : ''}"><td></td><td colspan="3" class="gs-label">${esc(g[0].student || '이 사람')} 합계 ${g.length}가지</td><td class="gs-total">${won(groupTotal)}</td><td colspan="3"></td></tr>` : ''}`;
    }).join('');
    R('total').textContent = won(pendingTotal());
    const savedOrders = new Set(rows.filter(r => r.saved).map(r => r.group)).size;
    R('count').textContent = savedOrders ? `기록됨 ${savedOrders}건` : '';
  }

  // 물품이나 수량이 바뀌면 가격을 자동으로 다시 계산 (직접 고친 값은 다음 변경 전까지 유지)
  function recalc(r) {
    const m = menuById(r.item);
    if (m) r.price = (Number(m.price) || 0) * (Number(r.qty) || 0);
  }
  // 이름·결제·요일은 묶음의 첫 줄 값을 같은 사람 줄에도 똑같이 넣어 둔다
  function syncGroup(lead) {
    groupRows(lead.group).forEach(x => { x.student = lead.student; x.pay = lead.pay; x.day = lead.day; });
  }

  R('rows').addEventListener('input', e => {
    const tr = e.target.closest('tr'); if (!tr) return;
    const r = rows.find(x => x.id === tr.dataset.id); if (!r || r.saved) return;
    const c = e.target.dataset.c;
    if (c === 'qty') { r.qty = Math.max(1, parseInt(e.target.value) || 1); recalc(r); const pf = tr.querySelector('[data-c=price]'); if (pf) pf.value = r.price; R('total').textContent = won(pendingTotal()); }
    else if (c === 'price') { r.price = Math.max(0, parseInt(e.target.value) || 0); R('total').textContent = won(pendingTotal()); }
    else if (c === 'student') { r.student = e.target.value; syncGroup(r); }
  });
  R('rows').addEventListener('change', e => {
    const tr = e.target.closest('tr'); if (!tr) return;
    const r = rows.find(x => x.id === tr.dataset.id); if (!r || r.saved) return;
    const c = e.target.dataset.c;
    if (c === 'item') { r.item = e.target.value; recalc(r); render(); }
    else if (c === 'pay') { r.pay = e.target.value; e.target.className = 'pay-sel pay-' + r.pay; syncGroup(r); }
    else if (c === 'day') { r.day = e.target.value; syncGroup(r); }
    else if (c === 'qty' || c === 'price') render(); // 묶음 합계 갱신
    else if (c === 'student') render();
  });
  R('rows').addEventListener('click', e => {
    const tr = e.target.closest('tr'); if (!tr || !tr.dataset.id) return;
    const r = rows.find(x => x.id === tr.dataset.id); if (!r) return;
    if (e.target.closest('[data-more]')) {
      // 이 사람 묶음의 마지막 줄 바로 아래에 같은 사람 줄을 넣는다
      const g = groupRows(r.group);
      const at = rows.indexOf(g[g.length - 1]) + 1;
      rows.splice(at, 0, newRow(r));
      render();
      const added = rows[at];
      R('rows').querySelector(`tr[data-id="${added.id}"] [data-c=item]`)?.focus();
      return;
    }
    if (e.target.closest('[data-del]')) {
      const wasLead = isLead(r);
      rows = rows.filter(x => x.id !== r.id);
      // 첫 줄을 지우면 다음 줄이 그 사람의 첫 줄이 된다 (이름·결제는 이미 같은 값)
      if (wasLead) { const next = groupRows(r.group)[0]; if (next) syncGroup(Object.assign(next, { student: r.student, pay: r.pay, day: r.day })); }
      if (!rows.some(x => !x.saved)) rows.push(newRow());
      render();
    }
  });
  R('add').onclick = () => {
    rows.push(newRow()); render();
    const last = rows[rows.length - 1];
    R('rows').querySelector(`tr[data-id="${last.id}"] [data-c=student]`)?.focus();
  };

  R('save').onclick = async () => {
    // 아직 기록 안 한 묶음을 순서대로
    const groups = [...new Set(rows.filter(r => !r.saved).map(r => r.group))];
    const ready = [], incomplete = [];
    groups.forEach(g => {
      const gr = groupRows(g);
      const filled = gr.filter(r => r.item && r.qty > 0 && menuById(r.item));
      const lead = gr[0];
      if (!filled.length && !lead.student.trim()) return;          // 완전히 빈 사람은 건너뛴다
      if (!lead.student.trim() || !filled.length) { incomplete.push(lead.student.trim() || '이름 없음'); return; }
      ready.push({ g, lead, filled });
    });
    if (incomplete.length) toast(`${incomplete.join(', ')}: 이름과 물품을 채워야 기록돼요.`, 'error');
    if (!ready.length) { if (!incomplete.length) toast('채운 줄이 없어요. 이름과 물품을 적어 주세요.', 'error'); return; }
    R('save').disabled = true;
    let ok = 0;
    for (const { g, lead, filled } of ready) {
      // 같은 메뉴를 두 줄에 나눠 적었으면 합친다
      const merged = {};
      filled.forEach(r => {
        const m = menuById(r.item);
        const it = (merged[m.id] ||= { id: m.id, name: m.name, price: Number(m.price) || 0, qty: 0, line: 0 });
        it.qty += Number(r.qty) || 0;
        it.line += Number(r.price) || (Number(m.price) || 0) * (Number(r.qty) || 0);
      });
      const items = Object.values(merged).map(({ line, ...it }) => it);
      const total = Object.values(merged).reduce((s, it) => s + it.line, 0);
      try {
        const res = await store.placeOrder({
          uid: store.user.uid, email: store.user.email || '', student: lead.student.trim(),
          location: '현장', payment: lead.pay, cashGiven: 0, note: '', day: lead.day || '',
          items, total, source: 'walkup',
        });
        // 물품을 안 고른 줄은 지우고, 나머지 줄을 기록됨으로 잠근다
        rows = rows.filter(r => r.group !== g || filled.includes(r));
        groupRows(g).forEach(r => { r.saved = true; r.number = res.number; });
        ok++;
      } catch (e) { toast(errText(e), 'error'); }
    }
    // 빈 사람 칸이 부족하면 몇 칸 더 깔아 둔다
    const emptyPeople = new Set(rows.filter(r => !r.saved).map(r => r.group)).size;
    for (let i = emptyPeople; i < 3; i++) rows.push(newRow());
    render();
    R('save').disabled = false;
    if (ok) toast(`${ok}명 주문을 기록했어요.`, 'good');
  };

  const unsub = store.watchMenu(l => {
    menu = l;
    if (!rows.length) rows = Array.from({ length: EMPTY_PEOPLE }, () => newRow());
    render();
  });
  return { unsub };
}

/* ---------- 회계 정리 ---------- */

// 결제방법별로 묶은 장부. 한 줄 = 주문 하나 (반 이름, 주문 내용, 수량, 총 가격, 결제방법).
export function mountAccounting(root) {
  root.innerHTML = `
    <div class="toolbar row-wrap">
      <div class="chips" data-r="pay"></div>
      <label class="radio inline-check"><input type="checkbox" data-r="cancel"> 취소 주문 포함</label>
      <button class="btn small" data-r="csv">회계 CSV 받기</button>
    </div>
    <div data-r="body"></div>`;
  const st = { orders: [], pay: 'all', withCancel: false };
  const R = n => $(`[data-r=${n}]`, root);
  const itemsText = o => (o.items || []).map(i => `${i.name} ×${i.qty}`).join(', ');
  const qtyOf = o => (o.items || []).reduce((s, i) => s + (Number(i.qty) || 0), 0);

  function visible() {
    let list = st.orders.filter(o => st.withCancel || o.status !== 'cancelled');
    if (st.pay !== 'all') list = list.filter(o => o.payment === st.pay);
    return [...list].reverse(); // 들어온 순서대로
  }

  function groupTable(title, rows) {
    if (!rows.length) return '';
    const total = rows.reduce((s, o) => s + (Number(o.total) || 0), 0);
    const qty = rows.reduce((s, o) => s + qtyOf(o), 0);
    return `
    <div class="card acc-group">
      <h3>${esc(title)} · ${rows.length}건 · ${won(total)}</h3>
      <div class="table-wrap"><table class="table acc-table">
        <thead><tr><th>번호</th><th>반 이름</th><th>주문 내용</th><th>수량</th><th>총 가격</th><th>결제방법</th></tr></thead>
        <tbody>
          ${rows.map(o => `<tr class="${o.status === 'cancelled' ? 'cancelled-row' : ''}">
            <td>#${esc(o.number)}${o.source === 'walkup' ? ' <span class="tag-mini">현장</span>' : ''}</td>
            <td>${esc(o.student)}</td>
            <td>${esc(itemsText(o))}</td>
            <td>${qtyOf(o)}</td>
            <td>${won(o.total)}${o.status === 'cancelled' ? ' (취소)' : ''}</td>
            <td>${esc(PAYMENT[o.payment] || o.payment)}</td>
          </tr>`).join('')}
        </tbody>
        <tfoot><tr><td colspan="3">소계</td><td>${qty}</td><td>${won(total)}</td><td></td></tr></tfoot>
      </table></div>
    </div>`;
  }

  const PAY_KEYS = ['cash', 'transfer', 'credit']; // 회계에서 묶는 결제방법 순서

  function render() {
    R('pay').innerHTML = [['all', '전체'], ...PAY_KEYS.map(k => [k, PAYMENT[k]])].map(([k, label]) => {
      const n = st.orders.filter(o => (st.withCancel || o.status !== 'cancelled') && (k === 'all' || o.payment === k)).length;
      return `<button class="chip ${st.pay === k ? 'on' : ''}" data-f="${k}">${label} ${n}</button>`;
    }).join('');

    const list = visible();
    const valid = list.filter(o => o.status !== 'cancelled');
    const grand = valid.reduce((s, o) => s + (Number(o.total) || 0), 0);
    // 외상(받을 돈)은 따로도 보여준다
    const credit = valid.filter(o => o.payment === 'credit' && !o.paid).reduce((s, o) => s + (Number(o.total) || 0), 0);
    let html = `<div class="acc-grand">합계 (취소 제외) <strong>${won(grand)}</strong> · ${valid.length}건${credit ? ` · 외상 받을 돈 <strong class="credit-amt">${won(credit)}</strong>` : ''}</div>`;
    if (st.pay === 'all') {
      // 결제방법으로 정리해서 보여준다
      PAY_KEYS.forEach(k => { html += groupTable(PAYMENT[k], list.filter(o => o.payment === k)); });
    } else {
      html += groupTable(PAYMENT[st.pay] || st.pay, list);
    }
    if (!list.length) html += '<p class="empty">정리할 주문이 없어요.</p>';
    R('body').innerHTML = html;
  }

  R('pay').addEventListener('click', e => { const f = e.target.closest('[data-f]')?.dataset.f; if (f) { st.pay = f; render(); } });
  R('cancel').addEventListener('change', e => { st.withCancel = e.target.checked; render(); });
  R('csv').onclick = () => downloadCsv(`회계정리_${today()}.csv`,
    ['번호', '반 이름', '주문 내용', '수량', '총 가격', '결제방법', '요일', '현장', '상태'],
    visible().map(o => [o.number, o.student, itemsText(o), qtyOf(o), o.total, PAYMENT[o.payment] || o.payment, o.day || '', o.source === 'walkup' ? 'O' : '', STATUS[o.status]?.label || o.status]));

  const unsub = store.watchAllOrders(list => { st.orders = list; render(); });
  return { unsub };
}

/* ---------- 도구 ---------- */

export function today() { return new Date().toISOString().slice(0, 10); }

export function downloadCsv(name, head, rows) {
  const cell = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const text = [head.map(cell).join(','), ...rows.map(r => r.map(cell).join(','))].join('\n');
  // 엑셀에서 한글이 안 깨지게 BOM을 붙인다
  download(name, new Blob(['\uFEFF' + text], { type: 'text/csv;charset=utf-8' }));
}
export function download(name, blob) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export function tabs(nav, sections, onChange) {
  $$('.tab', nav).forEach(t => t.addEventListener('click', () => {
    $$('.tab', nav).forEach(x => x.classList.toggle('active', x === t));
    Object.entries(sections).forEach(([n, el]) => el.classList.toggle('hidden', n !== t.dataset.tab));
    if (onChange) onChange(t.dataset.tab);
  }));
}
