// 펀드 담당자 화면: 주문 처리, 메뉴·품절, 매출, 운영
// 들어올 수 있는 사람: role이 'fund'인 사용자, 개발자
import { store, DEMO, PREVIEW, setPage, isDeveloper } from './store.js';
import { $, esc, toast, askNotify } from './ui.js';
import { loginGate, deniedGate, mountOrders, mountMenu, mountSettings, mountAccounting, mountWalkup, renderStats, tabs } from './panels.js';

setPage('fund');
let mounted = [];
let ordersPanel = null;

if (PREVIEW) $('#banners').innerHTML = `<div class="banner warn">미리보기 모드예요. 로그인 없이 열리고, 주문은 이 브라우저에만 저장돼요. 같은 브라우저 다른 탭에서 학생 화면으로 주문해 보세요.</div>`;
else if (DEMO) $('#banners').innerHTML = `<div class="banner warn">데모 모드예요. 같은 브라우저 다른 탭에서 학생 화면(index.html)으로 주문해 보세요.</div>`;

tabs($('#nav'), {
  orders: $('#tab-orders'), walkup: $('#tab-walkup'), menu: $('#tab-menu'), accounting: $('#tab-accounting'), stats: $('#tab-stats'), settings: $('#tab-settings'),
}, name => {
  if (name === 'orders' && ordersPanel) ordersPanel.clearFresh();
  if (name === 'stats' && ordersPanel) renderStats($('#tab-stats'), ordersPanel.orders);
});

$('#outBtn').onclick = () => store.signOut().then(() => toast('로그아웃했어요.'));

store.onAuth(async u => {
  mounted.forEach(m => m.unsub && m.unsub());
  mounted = []; ordersPanel = null;
  $('#outBtn').classList.toggle('hidden', !u || PREVIEW);
  $('#app').classList.add('hidden');
  $('#gate').classList.remove('hidden');
  $('#who').textContent = '';

  const demoButton = DEMO ? { label: '데모 펀드 담당자로 들어가기', onClick: () => store.demoFundLogin() } : null;
  // 미리보기: 로그인 화면 없이 바로 펀드 담당자로 들어간다
  if (PREVIEW && (!u || u.email !== 'demo.fund@example.com')) { $('#gate').innerHTML = ''; return store.demoFundLogin(); }
  if (!u) return loginGate($('#gate'), { title: '펀드 담당자 로그인', demoButton });

  let role = '', staff = [];
  try { [role, staff] = await Promise.all([store.getRole(u.uid), store.getStaff()]); } catch (e) { console.error(e); }
  const dev = isDeveloper(u);
  const byEmail = !!u.email && u.emailVerified !== false && staff.includes(u.email.toLowerCase());
  if (role !== 'fund' && !byEmail && !dev) {
    return deniedGate($('#gate'), u, {
      message: u.emailVerified === false
        ? '메일 인증이 안 된 계정이에요. 인증 메일의 링크를 누르거나 구글로 로그인해 주세요.'
        : `개발자에게 이 이메일(${u.email || '없음'})을 펀드 담당자로 등록해 달라고 하세요. 등록되면 새로고침하면 들어와져요.`,
      demoButton,
    });
  }

  $('#gate').classList.add('hidden');
  $('#app').classList.remove('hidden');
  $('#who').innerHTML = `<span class="role-tag ${dev ? 'dev' : 'fund'}">${dev ? '개발자' : '펀드 담당'}</span>${esc(u.email || '')}`;
  askNotify();

  ordersPanel = mountOrders($('#tab-orders'), {
    onNewCount: n => { const c = $('#newCount'); c.textContent = n; c.classList.toggle('hidden', !n); },
    onOrders: list => { if (!$('#tab-stats').classList.contains('hidden')) renderStats($('#tab-stats'), list); },
  });
  mounted.push(ordersPanel, mountWalkup($('#tab-walkup')), mountMenu($('#tab-menu')), mountAccounting($('#tab-accounting')), mountSettings($('#tab-settings')));
});
