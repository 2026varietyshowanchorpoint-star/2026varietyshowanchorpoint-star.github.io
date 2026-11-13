// 펀드 페이지와 개발자 페이지가 같이 쓰는 화면 조각 (주문판, 메뉴 관리, 매출, 운영 설정)
// 페이지는 따로지만 기능 코드는 한 곳에서 고치도록 여기 모았다.
import { SHOP } from './config.js';
import { store } from './store.js';
import { $, $$, won, esc, timeText, badge, toast, errText, notify, beep, STATUS, PAYMENT, CATEGORY } from './ui.js';

/* ---------- 로그인 화면 (펀드/개발자 공통) ---------- */

export function loginGate(root, { title, demoButton }) {
  root.innerHTML = `
    <div class="card narrow">
      <h2>${esc(title)}</h2>
      ${demoButton ? `<button class="btn primary wide" id="demoBtn">${esc(demoButton.label)}</button><div class="or">또는</div>` : ''}
      <button class="btn google wide" id="gBtn">구글 계정으로 로그인</button>
      <form id="lf" class="form">
        <input type="email" name="email" placeholder="이메일" required>
        <input type="password" name="pw" placeholder="비밀번호">
        <button class="btn wide" type="submit">이메일로 로그인</button>
      </form>
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
  ['unpaid', '입금 확인 전', o => o.payment === 'transfer' && !o.paid && o.status !== 'cancelled'],
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
    <div class="toolbar">
      <div class="chips" data-r="filters"></div>
      <input type="search" data-r="search" placeholder="번호, 이름, 위치, 이메일 검색">
    </div>
    <div class="order-board" data-r="list"></div>`;
  const st = { orders: [], filter: 'active', query: '', seen: null, fresh: new Set() };
  const R = n => $(`[data-r=${n}]`, root);

  function card(o) {
    const change = o.payment === 'cash' && o.cashGiven > o.total ? o.cashGiven - o.total : 0;
    return `
    <article class="order-card admin-card st-${esc(o.status)} ${st.fresh.has(o.id) ? 'fresh' : ''}" data-id="${esc(o.id)}">
      <header><span class="num big">#${esc(o.number)}</span>${badge(o.status)}${o.source === 'walkup' ? '<span class="badge badge-blue">현장</span>' : ''}<span class="time">${timeText(o.createdAt)}</span></header>
      <div class="who"><strong>${esc(o.student)}</strong> · ${esc(o.location)}</div>
      <ul class="items">${(o.items || []).map(i => `<li><b>${esc(i.qty)}</b> ${esc(i.name)}</li>`).join('')}</ul>
      ${o.note ? `<p class="note">${esc(o.note)}</p>` : ''}
      <div class="meta">
        <strong>${won(o.total)}</strong>
        <span>${esc(PAYMENT[o.payment] || o.payment)}</span>
        ${change ? `<span class="warn-text">거스름돈 ${won(change)} (${won(o.cashGiven)} 냄)</span>` : ''}
      </div>
      <div class="actions">
        ${(NEXT[o.status] || []).map(([s, label]) => `<button class="btn primary small" data-set="${s}">${label}</button>`).join('')}
        ${o.payment === 'transfer' && o.status !== 'cancelled'
          ? `<button class="btn small ${o.paid ? 'good' : ''}" data-paid="${o.paid ? 0 : 1}">${o.paid ? '입금 확인됨' : '입금 확인'}</button>` : ''}
        ${!['done', 'cancelled'].includes(o.status) ? '<button class="btn ghost small" data-set="cancelled">취소</button>' : ''}
        ${dev ? `<select class="small-select" data-force aria-label="상태 강제 변경">
            <option value="">상태 강제 변경</option>
            ${Object.entries(STATUS).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('')}
          </select>
          <button class="btn ghost small danger" data-del>삭제</button>` : ''}
      </div>
      <div class="sub">${esc(o.email || '')}</div>
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
        toast(`#${st.orders.find(o => o.id === id)?.number} ${STATUS[btn.dataset.set].label}`);
      } else if (btn.dataset.paid) {
        await store.updateOrder(id, { paid: btn.dataset.paid === '1' });
      } else if ('del' in btn.dataset) {
        if (!confirm('주문을 완전히 지울까요? 되돌릴 수 없어요.')) return;
        await store.deleteOrder(id);
      }
    } catch (err) { toast(errText(err), 'error'); btn.disabled = false; }
  });

  const unsub = store.watchAllOrders(list => {
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
      <input name="imageUrl" placeholder="사진 주소 (선택)">
      <button class="btn primary" type="submit">추가</button>
    </form>
    <div data-r="list"></div>`;
  let menu = [];
  const list = $('[data-r=list]', root);

  $('[data-r=add]', root).onsubmit = async ev => {
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

  function render() {
    if (!menu.length) { list.innerHTML = '<p class="empty">메뉴가 없어요. 위에서 추가하세요.</p>'; return; }
    list.innerHTML = menu.map((m, i) => `
      <div class="card menu-row ${m.soldOut ? 'sold' : ''}" data-id="${esc(m.id)}">
        <div class="order-btns">
          <button class="btn ghost small" data-move="-1" ${i === 0 ? 'disabled' : ''} aria-label="위로">▲</button>
          <button class="btn ghost small" data-move="1" ${i === menu.length - 1 ? 'disabled' : ''} aria-label="아래로">▼</button>
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
      o.payment === 'transfer' ? (o.paid ? 'O' : 'X') : '', o.cashGiven || '', o.note, o.email,
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

// 펀드 담당자가 부스 앞에서 받은 주문을 직접 적는 곳. 온라인 주문과 같은 orders에 저장돼서
// 주문판·회계·매출에 똑같이 잡힌다. 계좌이체는 bankInfo가 있을 때만 고를 수 있다.
export function mountWalkup(root) {
  const canTransfer = !!SHOP.bankInfo;
  root.innerHTML = `
    <div class="card">
      <h3>현장 주문 기록</h3>
      <p class="muted">부스에서 바로 받은 주문을 적어요. 적으면 주문판과 회계 정리에 같이 들어가요.</p>
      <form class="form" data-r="form">
        <div class="row-wrap">
          <input name="student" placeholder="이름 학년반 (예: ${esc(SHOP.studentHint)})" required>
          <select name="payment">
            <option value="cash">${PAYMENT.cash}</option>
            ${canTransfer ? `<option value="transfer">${PAYMENT.transfer}</option>` : ''}
          </select>
        </div>
        <div class="walkup-items" data-r="items"></div>
        <div class="walkup-total">합계 <strong data-r="total">0원</strong></div>
        <button class="btn primary" type="submit" data-r="submit">현장 주문 기록</button>
      </form>
    </div>`;
  const R = n => $(`[data-r=${n}]`, root);
  let menu = [];
  const qty = {}; // menuId -> 수량

  function renderItems() {
    R('items').innerHTML = menu.length ? menu.map(m => `
      <div class="walkup-row ${m.soldOut ? 'sold' : ''}" data-id="${esc(m.id)}">
        <span class="wu-name">${esc(m.name)}${m.soldOut ? ' (품절)' : ''}</span>
        <span class="wu-price">${won(m.price)}</span>
        <div class="stepper">
          <button type="button" data-act="minus" aria-label="빼기" ${(qty[m.id] || 0) ? '' : 'disabled'}>−</button>
          <span>${qty[m.id] || 0}</span>
          <button type="button" data-act="plus" aria-label="더하기">+</button>
        </div>
      </div>`).join('') : '<p class="empty">메뉴가 없어요.</p>';
    const total = menu.reduce((s, m) => s + (qty[m.id] || 0) * (Number(m.price) || 0), 0);
    R('total').textContent = won(total);
  }

  R('items').addEventListener('click', e => {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const id = btn.closest('.walkup-row').dataset.id;
    const q = qty[id] || 0;
    qty[id] = btn.dataset.act === 'plus' ? Math.min(q + 1, 50) : Math.max(q - 1, 0);
    renderItems();
  });

  R('form').onsubmit = async ev => {
    ev.preventDefault();
    const student = R('form').student.value.trim();
    const items = menu.filter(m => qty[m.id] > 0).map(m => ({ id: m.id, name: m.name, price: Number(m.price) || 0, qty: qty[m.id] }));
    if (!items.length) return toast('물품을 하나 이상 골라 주세요.', 'error');
    const total = items.reduce((s, i) => s + i.price * i.qty, 0);
    const submit = R('submit');
    submit.disabled = true;
    try {
      const res = await store.placeOrder({
        uid: store.user.uid, email: store.user.email || '', student, location: '현장',
        payment: R('form').payment.value, cashGiven: 0, note: '', items, total, source: 'walkup',
      });
      toast(`현장 주문 #${res.number} 기록했어요. ${won(total)}`, 'good');
      Object.keys(qty).forEach(k => delete qty[k]);
      R('form').reset();
      renderItems();
    } catch (e) { toast(errText(e), 'error'); }
    submit.disabled = false;
  };

  const unsub = store.watchMenu(l => { menu = l; renderItems(); });
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

  function render() {
    R('pay').innerHTML = [['all', '전체'], ['cash', PAYMENT.cash], ['transfer', PAYMENT.transfer]].map(([k, label]) => {
      const n = st.orders.filter(o => (st.withCancel || o.status !== 'cancelled') && (k === 'all' || o.payment === k)).length;
      return `<button class="chip ${st.pay === k ? 'on' : ''}" data-f="${k}">${label} ${n}</button>`;
    }).join('');

    const list = visible();
    const grand = list.filter(o => o.status !== 'cancelled').reduce((s, o) => s + (Number(o.total) || 0), 0);
    let html = `<div class="acc-grand">합계 (취소 제외) <strong>${won(grand)}</strong> · ${list.filter(o => o.status !== 'cancelled').length}건</div>`;
    if (st.pay === 'all') {
      // 결제방법으로 정리해서 보여준다
      html += groupTable('현금 (후불)', list.filter(o => o.payment === 'cash'));
      html += groupTable('계좌이체 (선불)', list.filter(o => o.payment === 'transfer'));
    } else {
      html += groupTable(PAYMENT[st.pay] || st.pay, list);
    }
    if (!list.length) html += '<p class="empty">정리할 주문이 없어요.</p>';
    R('body').innerHTML = html;
  }

  R('pay').addEventListener('click', e => { const f = e.target.closest('[data-f]')?.dataset.f; if (f) { st.pay = f; render(); } });
  R('cancel').addEventListener('change', e => { st.withCancel = e.target.checked; render(); });
  R('csv').onclick = () => downloadCsv(`회계정리_${today()}.csv`,
    ['번호', '반 이름', '주문 내용', '수량', '총 가격', '결제방법', '상태'],
    visible().map(o => [o.number, o.student, itemsText(o), qtyOf(o), o.total, PAYMENT[o.payment] || o.payment, STATUS[o.status]?.label || o.status]));

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
