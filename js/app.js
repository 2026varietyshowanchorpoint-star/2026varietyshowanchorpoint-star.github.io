// 소비자용 화면
import { SHOP } from './config.js';
import { menuImage } from './menu-images.js';
import { store, DEMO, PREVIEW, setPage, validEmail, inAppBrowser } from './store.js';
import {
  $, $$, won, esc, timeText, badge, toast, errText, askNotify, notify,
  openModal, closeModal, registerSW, forgotHelp, STATUS, STATUS_FLOW, STATUS_MESSAGE, PAYMENT, CATEGORY,
} from './ui.js';

setPage('order');
registerSW();

const state = {
  user: null,
  profile: null,
  menu: [],
  settings: {},
  orders: [],
  cart: loadCart(),     // { menuId: qty }
  lastStatus: null,     // 상태 변화 감지용 { orderId: status }
};
let unwatchOrders = null;

/* ---------- 기본 화면 ---------- */

$('#shopTitle').textContent = SHOP.title;
$('#shopSub').textContent = SHOP.subtitle;
document.title = SHOP.title;
$('#foot').innerHTML = [
  SHOP.contact && esc(SHOP.contact),
  SHOP.instagram && `<a href="${esc(SHOP.instagram)}" target="_blank" rel="noopener">인스타그램</a>`,
].filter(Boolean).join(' · ');

$$('.tab').forEach(t => t.addEventListener('click', () => showTab(t.dataset.tab)));
function showTab(name) {
  $$('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
  $('#tab-menu').classList.toggle('hidden', name !== 'menu');
  $('#tab-orders').classList.toggle('hidden', name !== 'orders');
  $('#cartBar').classList.toggle('force-hide', name !== 'menu');
}

function renderBanners() {
  const out = [];
  const inApp = inAppBrowser();
  if (inApp && !state.user && !PREVIEW) out.push(`<div class="banner warn">${inApp} 안에서 열었어요. 구글 로그인은 여기서 안 되니, 오른쪽 위 메뉴에서 "다른 브라우저로 열기"를 눌러 크롬이나 사파리로 열어 주세요. 이메일 로그인은 여기서도 돼요.</div>`);
  if (PREVIEW) out.push(`<div class="banner warn">미리보기 모드예요. 로그인 없이 주문해 볼 수 있고, 주문은 이 브라우저에만 저장돼요.</div>`);
  else if (DEMO) out.push(`<div class="banner warn">데모 모드예요. 주문은 이 브라우저에만 저장돼요. 펀드 화면(fund.html)을 다른 탭에 열어 두면 주문이 바로 보여요.</div>`);
  if (!isOpen()) out.push(`<div class="banner danger">지금은 주문을 받지 않아요.</div>`);
  if (state.settings.notice) out.push(`<div class="banner">${esc(state.settings.notice)}</div>`);
  // 메일로 가입했는데 아직 인증 안 한 사람
  if (!PREVIEW && state.user && state.user.email && state.user.emailVerified === false) {
    out.push(`<div class="banner warn verify-banner">
      메일 인증이 아직 안 됐어요. ${DEMO ? '데모라 실제 메일은 안 가요.' : `<strong>${esc(state.user.email)}</strong> 메일함에서 인증 링크를 눌러 주세요.`}
      <div class="verify-actions">
        <button class="btn small" data-verify="resend">${DEMO ? '데모: 인증 완료 처리' : '인증 메일 다시 보내기'}</button>
        ${DEMO ? '' : '<button class="btn small" data-verify="check">인증했어요 (새로고침)</button>'}
      </div>
    </div>`);
  }
  $('#banners').innerHTML = out.join('');
  const pill = $('#openPill');
  pill.textContent = isOpen() ? '주문 받는 중' : '주문 마감';
  pill.className = 'pill ' + (isOpen() ? 'open' : 'closed');
  // 방금 나온 픽업 번호 (1시간 안에 나온 것만)
  const ready = state.settings.ready || [];
  const fresh = ready.length && Date.now() - (state.settings.readyAt || 0) < 60 * 60 * 1000;
  $('#readyNums').classList.toggle('hidden', !fresh);
  if (fresh) $('#readyNums').innerHTML = `<span>방금 나온 번호</span>${ready.map((n, i) => `<b class="${i === 0 ? 'latest' : ''}">${esc(n)}</b>`).join('')}`;
}
const isOpen = () => (state.settings.open ?? SHOP.defaultOpen) !== false;

$('#banners').addEventListener('click', async e => {
  const act = e.target.closest('[data-verify]')?.dataset.verify;
  if (!act) return;
  try {
    if (act === 'resend') {
      await store.sendVerification();
      if (DEMO) { state.user = store.user; renderBanners(); toast('인증 처리했어요.'); }
      else toast('인증 메일을 다시 보냈어요. 메일함을 확인하세요.');
    } else if (act === 'check') {
      await store.reloadUser();
      state.user = store.user;
      renderBanners();
      toast(state.user.emailVerified ? '인증됐어요!' : '아직 인증 전이에요. 메일 링크를 눌러 주세요.', state.user.emailVerified ? 'good' : 'error');
    }
  } catch (err) { toast(errText(err), 'error'); }
});

/* ---------- 로그인 ---------- */

store.onAuth(async u => {
  state.user = u;
  state.profile = null;
  $('#userBtn').textContent = u ? '내 정보' : '로그인';
  if (unwatchOrders) { unwatchOrders(); unwatchOrders = null; }
  state.orders = []; state.lastStatus = null;
  if (u) {
    try {
      state.profile = await store.getProfile(u.uid);
      if (!state.profile) {
        await store.saveProfile(u.uid, { email: u.email || '', name: u.displayName || '', createdAt: Date.now() });
        state.profile = await store.getProfile(u.uid);
      }
    } catch (e) { console.error(e); }
    unwatchOrders = store.watchMyOrders(u.uid, onOrders);
  }
  renderBanners();
  renderOrders();
});

$('#userBtn').addEventListener('click', () => (state.user ? openProfile() : openLogin()));
if (PREVIEW) $('#userBtn').classList.add('hidden');

function openLogin(after) {
  const m = openModal(`
    <h2>로그인</h2>
    <p class="muted">주문 상태를 확인하려면 로그인이 필요해요.</p>
    <button class="btn google wide" id="gBtn">구글 계정으로 로그인</button>
    <div class="or">또는 이메일</div>
    <form id="loginForm" class="form">
      <input type="email" name="email" placeholder="이메일" required autocomplete="email">
      <input type="password" name="pw" placeholder="비밀번호 (6자 이상)" ${DEMO ? '' : 'required minlength="6"'} autocomplete="current-password">
      <div class="row">
        <button class="btn primary" type="submit" data-mode="in">로그인</button>
        <button class="btn" type="submit" data-mode="up">회원가입</button>
      </div>
    </form>
    ${forgotHelp()}
    <p class="muted small-note">로그인하면 이메일과 접속 시간이 기록돼요.</p>
    <button class="btn ghost wide" id="closeBtn">닫기</button>`);
  const done = () => { closeModal(); toast('로그인했어요.'); if (after) after(); };
  $('#gBtn', m).onclick = async () => {
    try { await store.signInGoogle(); done(); } catch (e) { toast(errText(e), 'error'); }
  };
  let mode = 'in';
  $$('button[type=submit]', m).forEach(b => b.addEventListener('click', () => (mode = b.dataset.mode)));
  $('#loginForm', m).onsubmit = async ev => {
    ev.preventDefault();
    const f = new FormData(ev.target);
    const email = f.get('email');
    if (!validEmail(email)) return toast('이메일 형식이 맞지 않아요.', 'error');
    try {
      if (mode === 'up') {
        await store.signUpEmail(email, f.get('pw'));
        closeModal();
        toast(DEMO ? '가입했어요.' : '가입했어요. 인증 메일을 보냈어요. 메일함을 확인하세요.', 'good');
        if (after) after();
      } else {
        await store.signInEmail(email, f.get('pw'));
        done();
      }
    } catch (e) { toast(errText(e), 'error'); }
  };
  $('#closeBtn', m).onclick = closeModal;
}

function openProfile() {
  const p = state.profile || {};
  const m = openModal(`
    <h2>내 정보</h2>
    <p class="muted">${esc(state.user.email || '')}</p>
    <form id="pf" class="form">
      <label>학년 반 이름<input name="student" value="${esc(p.student || '')}" placeholder="${esc(SHOP.studentHint)}"></label>
      <label>자주 받는 위치<input name="location" value="${esc(p.location || '')}" placeholder="${esc(SHOP.locationHint)}"></label>
      <button class="btn primary wide" type="submit">저장</button>
    </form>
    <button class="btn ghost wide" id="outBtn">로그아웃</button>`);
  $('#pf', m).onsubmit = async ev => {
    ev.preventDefault();
    const f = new FormData(ev.target);
    const data = { student: f.get('student').trim(), location: f.get('location').trim() };
    try {
      await store.saveProfile(state.user.uid, data);
      state.profile = { ...state.profile, ...data };
      closeModal(); toast('저장했어요.');
    } catch (e) { toast(errText(e), 'error'); }
  };
  $('#outBtn', m).onclick = async () => { await store.signOut(); closeModal(); toast('로그아웃했어요.'); };
}

/* ---------- 메뉴와 장바구니 ---------- */

store.watchSettings(s => { state.settings = s || {}; renderBanners(); renderCart(); });
store.watchMenu(list => {
  state.menu = list;
  // 품절됐거나 삭제된 메뉴는 장바구니에서 뺀다
  for (const id of Object.keys(state.cart)) {
    const m = list.find(x => x.id === id);
    if (!m || m.soldOut) delete state.cart[id];
  }
  saveCart();
  renderMenu();
  renderCart();
});

function loadCart() {
  try { return JSON.parse(sessionStorage.getItem('fund-cart')) || {}; } catch (e) { return {}; }
}
function saveCart() {
  try { sessionStorage.setItem('fund-cart', JSON.stringify(state.cart)); } catch (e) { /* 무시 */ }
}

function renderMenu() {
  if (!state.menu.length) {
    $('#menuList').innerHTML = '<p class="empty">메뉴를 준비하고 있어요.<br>조금 뒤에 다시 들어와 주세요.</p>';
    return;
  }
  const groups = {};
  state.menu.forEach(m => (groups[m.category || 'food'] ||= []).push(m));
  $('#menuList').innerHTML = Object.entries(groups).map(([cat, items]) => `
    <section class="board">
      <h2 class="board-cat">${esc(CATEGORY[cat] || cat)}</h2>
      <ul class="board-list">
      ${items.map(m => {
        const q = state.cart[m.id] || 0;
        return `
        <li class="board-row ${m.soldOut ? 'sold' : ''} ${q ? 'in-cart' : ''}" data-id="${esc(m.id)}">
          <img class="board-img" src="${esc(menuImage(m))}" alt="" loading="lazy">
          <div class="board-main">
            <span class="board-name">${esc(m.name)}</span>
            ${m.description ? `<span class="board-desc">${esc(m.description)}</span>` : ''}
            <span class="board-price">${won(m.price)}</span>
          </div>
          ${m.soldOut ? '<span class="soldtag">품절</span>' : `
          <div class="stepper ${q ? 'has' : ''}">
            <button data-act="minus" aria-label="${esc(m.name)} 빼기" ${q ? '' : 'disabled'}>−</button>
            <span aria-live="polite">${q}</span>
            <button data-act="plus" aria-label="${esc(m.name)} 더하기">+</button>
          </div>`}
        </li>`;
      }).join('')}
      </ul>
    </section>`).join('');
}

$('#menuList').addEventListener('click', e => {
  const btn = e.target.closest('button[data-act]');
  if (!btn) return;
  const id = btn.closest('.board-row').dataset.id;
  const q = state.cart[id] || 0;
  if (btn.dataset.act === 'plus') state.cart[id] = Math.min(q + 1, 20);
  else if (q <= 1) delete state.cart[id];
  else state.cart[id] = q - 1;
  saveCart();
  renderMenu();
  renderCart();
});

function cartItems() {
  return Object.entries(state.cart).map(([id, qty]) => {
    const m = state.menu.find(x => x.id === id);
    return m ? { id, name: m.name, price: Number(m.price) || 0, qty } : null;
  }).filter(Boolean);
}
const cartTotal = () => cartItems().reduce((s, i) => s + i.price * i.qty, 0);

function renderCart() {
  const items = cartItems();
  const count = items.reduce((s, i) => s + i.qty, 0);
  $('#cartBar').classList.toggle('hidden', count === 0);
  $('#cartCount').textContent = count;
  $('#cartTotal').textContent = won(cartTotal());
  $('#checkoutBtn').disabled = !isOpen();
  $('#checkoutBtn').textContent = isOpen() ? '주문하기' : '주문 마감';
}

/* ---------- 주문서 ---------- */

$('#checkoutBtn').addEventListener('click', () => {
  if (!isOpen()) return toast('지금은 주문을 받지 않아요.', 'error');
  if (!state.user && PREVIEW) return store.signInGoogle().then(() => setTimeout(openCheckout, 50));
  if (!state.user) return openLogin(openCheckout);
  openCheckout();
});

function openCheckout() {
  const items = cartItems();
  if (!items.length) return;
  const p = state.profile || {};
  const m = openModal(`
    <h2>주문서</h2>
    <ul class="summary">
      ${items.map(i => `<li><span>${esc(i.name)} × ${i.qty}</span><span>${won(i.price * i.qty)}</span></li>`).join('')}
      <li class="total"><span>총 금액</span><span>${won(cartTotal())}</span></li>
    </ul>
    <form id="of" class="form">
      <label>학년 반 이름 *<input name="student" required value="${esc(p.student || '')}" placeholder="${esc(SHOP.studentHint)}"></label>
      <fieldset class="two">
        <legend>받는 방법 *</legend>
        <label class="radio"><input type="radio" name="how" value="delivery" checked>배달<span class="pay-hint">교실로 가져다줘요</span></label>
        <label class="radio"><input type="radio" name="how" value="pickup">픽업<span class="pay-hint">부스에서 받아요</span></label>
      </fieldset>
      <label id="locBox">배달 위치 *<input name="location" value="${esc(p.location || '')}" placeholder="${esc(SHOP.locationHint)}"></label>
      <fieldset>
        <legend>결제 방식 *</legend>
        <label class="radio"><input type="radio" name="payment" value="cash" required checked>현금<span class="pay-hint">받을 때 내기</span></label>
        <label class="radio"><input type="radio" name="payment" value="transfer" required>계좌이체<span class="pay-hint">먼저 입금</span></label>
        <label class="radio"><input type="radio" name="payment" value="credit" required>외상<span class="pay-hint">나중에 내기</span></label>
      </fieldset>
      <div id="bankBox" class="bank hidden">${SHOP.bankInfo
        ? `입금 계좌: <strong>${esc(SHOP.bankInfo)}</strong><br>입금자명은 학년 반 이름으로 해 주세요.`
        : '계좌 정보는 담당자가 곧 안내할게요.'}</div>
      <div id="creditBox" class="bank hidden">지금은 안 내도 돼요. 나중에 펀드 담당자에게 현금으로 주거나${SHOP.bankInfo ? ` <strong>${esc(SHOP.bankInfo)}</strong>로 보내 주세요.` : ' 계좌로 보내면 됩니다.'}</div>
      <label id="changeBox" class="hidden">거스름돈이 필요하면 낼 금액을 적어 주세요<input name="cashGiven" type="number" min="0" step="100" placeholder="예: 10000"></label>
      <label>요청 사항<textarea name="note" rows="2" maxlength="300" placeholder="예: 붕어빵 팥 1개, 슈크림 2개로 나눠 주세요"></textarea></label>
      <button class="btn primary wide" type="submit" id="placeBtn">${won(cartTotal())} 주문하기</button>
    </form>
    <button class="btn ghost wide" id="cancelBtn">닫기</button>`);

  const sync = () => {
    const pickup = $('input[name=how]:checked', m)?.value === 'pickup';
    $('#locBox', m).classList.toggle('hidden', pickup);
    $('input[name=location]', m).required = !pickup;
    const pay = $('input[name=payment]:checked', m)?.value;
    $('#bankBox', m).classList.toggle('hidden', pay !== 'transfer');
    $('#creditBox', m).classList.toggle('hidden', pay !== 'credit');
    $('#changeBox', m).classList.toggle('hidden', pay !== 'cash');
  };
  $$('input[name=payment], input[name=how]', m).forEach(r => r.addEventListener('change', sync));
  sync();
  $('#cancelBtn', m).onclick = closeModal;

  $('#of', m).onsubmit = async ev => {
    ev.preventDefault();
    const f = new FormData(ev.target);
    const btn = $('#placeBtn', m);
    btn.disabled = true; btn.textContent = '주문하는 중...';
    const order = {
      uid: state.user.uid,
      email: state.user.email || '',
      student: f.get('student').trim(),
      pickup: f.get('how') === 'pickup',
      location: f.get('how') === 'pickup' ? '부스 픽업' : f.get('location').trim(),
      payment: f.get('payment'),
      cashGiven: Number(f.get('cashGiven')) || 0,
      note: (f.get('note') || '').trim(),
      items: cartItems().map(({ id, name, price, qty }) => ({ id, name, price, qty })),
      total: cartTotal(),
    };
    try {
      const res = await store.placeOrder(order);
      // 다음 주문 때 다시 안 적어도 되게 저장
      const keep = order.pickup ? { student: order.student } : { student: order.student, location: order.location };
      store.saveProfile(state.user.uid, keep).catch(() => {});
      state.profile = { ...state.profile, ...keep };
      state.cart = {}; saveCart(); renderMenu(); renderCart();
      showDone(res.number, order);
    } catch (e) {
      toast('주문하지 못했어요: ' + errText(e), 'error');
      btn.disabled = false; btn.textContent = '다시 주문하기';
    }
  };
}

function showDone(number, order) {
  const how = order.pickup ? '부스에서 픽업' : `${order.location}로 배달`;
  const m = openModal(`
    <div class="done">
      <h2>주문이 들어갔어요</h2>
      <div class="ticket ticket-big">
        <div class="ticket-head">
          <span class="ticket-label">주문 번호</span>
          <span class="ticket-num">${esc(number)}</span>
        </div>
        <div class="ticket-body">
          <ul class="ticket-items">${order.items.map(i => `<li><span>${esc(i.name)}</span><span>${esc(i.qty)}개</span></li>`).join('')}</ul>
          <div class="ticket-foot"><span>${esc(how)}</span><strong>${won(order.total)}</strong></div>
          <div class="ticket-pay">${esc(PAYMENT[order.payment])}</div>
        </div>
      </div>
      ${order.payment === 'transfer' ? `<p class="bank">${SHOP.bankInfo ? `입금 계좌 <strong>${esc(SHOP.bankInfo)}</strong>` : '계좌 정보는 담당자가 곧 안내할게요.'}</p>` : ''}
      ${order.payment === 'credit' ? `<p class="bank">외상이에요. 나중에 펀드 담당자에게 내거나${SHOP.bankInfo ? ` <strong>${esc(SHOP.bankInfo)}</strong>로 보내 주세요.` : ' 계좌로 보내 주세요.'}</p>` : ''}
      <p class="muted">${order.pickup ? '음식이 나오면 알려 드릴게요. 부스에서 이 번호를 말해 주세요.' : '배달을 출발하면 알려 드릴게요.'}</p>
    </div>
    <button class="btn primary wide" id="okBtn">내 주문 보기</button>`);
  $('#okBtn', m).onclick = () => { closeModal(); showTab('orders'); };
  askNotify();
}

/* ---------- 내 주문 ---------- */

function onOrders(list) {
  // 처음 불러올 때는 알리지 않고, 그 뒤로 상태가 바뀐 것만 알린다
  if (state.lastStatus) {
    for (const o of list) {
      const before = state.lastStatus[o.id];
      if (before && before !== o.status && STATUS_MESSAGE[o.status]) {
        const msg = `#${o.number} ${STATUS_MESSAGE[o.status]}`;
        toast(msg, o.status === 'ready' ? 'good' : '');
        notify(SHOP.title, msg);
      }
    }
  }
  state.lastStatus = Object.fromEntries(list.map(o => [o.id, o.status]));
  state.orders = list;
  renderOrders();
}

function renderOrders() {
  const active = state.orders.filter(o => !['done', 'cancelled'].includes(o.status)).length;
  const c = $('#activeCount');
  c.textContent = active;
  c.classList.toggle('hidden', !active);

  if (!state.user) {
    $('#orderList').innerHTML = PREVIEW
      ? '<p class="empty">아직 주문이 없어요.<br>메뉴에서 골라 주문해 보세요.</p>'
      : `<div class="empty">로그인하면 내 주문이 보여요.<br><button class="btn primary" id="loginHere">로그인</button></div>`;
    if (!PREVIEW) $('#loginHere').onclick = () => openLogin();
    return;
  }
  if (!state.orders.length) {
    $('#orderList').innerHTML = '<p class="empty">아직 주문이 없어요.</p>';
    return;
  }
  $('#orderList').innerHTML = state.orders.map(o => {
    const step = STATUS_FLOW.indexOf(o.status);
    const steps = o.status === 'cancelled' ? '' : `
      <ol class="progress">
        ${['pending', 'making', (o.pickup || o.status === 'ready') ? 'ready' : 'delivering', 'done'].map(s =>
          `<li class="${STATUS_FLOW.indexOf(s) <= step ? 'on' : ''}">${STATUS[s].label}</li>`).join('')}
      </ol>`;
    return `
    <article class="order-card ticket-card st-${esc(o.status)}">
      <div class="stub">
        <span class="stub-num">${esc(o.number)}</span>
        ${badge(o.status)}
      </div>
      <div class="ticket-main">
        <header><span class="pay-tag">${esc(PAYMENT[o.payment] || o.payment)}</span><span class="time">${timeText(o.createdAt)}</span></header>
        ${steps}
        <ul class="items">${(o.items || []).map(i => `<li><span>${esc(i.name)}</span><span>${esc(i.qty)}개</span></li>`).join('')}</ul>
        <div class="meta">
          <span>${o.pickup ? '부스 픽업' : esc(o.location)}</span>
          ${o.payment === 'transfer' ? `<span>${o.paid ? '입금 확인됨' : '입금 확인 전'}</span>` : ''}
          ${o.payment === 'credit' ? `<span>${o.paid ? '외상 갚음' : '외상 안 냄'}</span>` : ''}
          <strong>${won(o.total)}</strong>
        </div>
        ${o.note ? `<p class="note">${esc(o.note)}</p>` : ''}
        ${['transfer', 'credit'].includes(o.payment) && !o.paid && o.status !== 'cancelled' && SHOP.bankInfo
          ? `<p class="bank">보낼 계좌 <strong>${esc(SHOP.bankInfo)}</strong><br>${won(o.total)}, 입금자명은 학년 반 이름으로 해 주세요.</p>` : ''}
        ${o.status === 'ready' ? `<p class="ready-msg">${o.pickup === false ? '곧 배달 가요.' : `나왔어요. 부스에서 <b>${esc(o.number)}번</b>이라고 말해 주세요.`}</p>` : ''}
        <div class="row-actions">
          ${o.status === 'pending' ? `<button class="btn ghost small" data-cancel="${esc(o.id)}">주문 취소</button>` : ''}
          ${['done', 'cancelled'].includes(o.status) ? `<button class="btn small" data-again="${esc(o.id)}">다시 주문</button>` : ''}
        </div>
      </div>
    </article>`;
  }).join('');
}

$('#orderList').addEventListener('click', async e => {
  const again = e.target.closest('[data-again]')?.dataset.again;
  if (again) {
    const o = state.orders.find(x => x.id === again);
    let added = 0, missing = 0;
    (o?.items || []).forEach(i => {
      const m = state.menu.find(x => x.id === i.id);
      if (!m || m.soldOut) { missing++; return; }
      state.cart[i.id] = Math.min((state.cart[i.id] || 0) + (Number(i.qty) || 1), 20); added++;
    });
    saveCart(); renderMenu(); renderCart(); showTab('menu');
    toast(added ? `장바구니에 담았어요.${missing ? ` (${missing}개는 품절이라 뺐어요)` : ''}` : '그 메뉴는 지금 없어요.', added ? 'good' : 'error');
    return;
  }
  const id = e.target.closest('[data-cancel]')?.dataset.cancel;
  if (!id) return;
  if (!confirm('이 주문을 취소할까요?')) return;
  try { await store.cancelMyOrder(id); toast('주문을 취소했어요.'); } catch (err) { toast(errText(err), 'error'); }
});

renderBanners();
