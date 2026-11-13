// 데이터 계층. Firebase 모드와 데모 모드가 같은 함수를 제공한다.
// 화면 코드는 이 파일의 store 객체만 쓴다.
import { firebaseConfig } from './config.js';

export const DEMO = !firebaseConfig;
export const ROLES = ['admin', 'staff'];

/* ---------------- 공통 ---------------- */

function sortNewest(list) {
  return list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

/* ---------------- 데모 모드 ---------------- */

function makeDemoStore() {
  const KEY = 'fund-order-demo-v1';
  const AUTH_KEY = 'fund-order-demo-auth';
  const listeners = new Set();
  // 주문·메뉴는 localStorage(탭끼리 공유), 로그인은 sessionStorage(탭마다 따로)

  const seedMenu = [
    ['붕어빵 (팥)', 1000, 'food'], ['붕어빵 (슈크림)', 1000, 'food'],
    ['떡볶이 컵', 3000, 'food'], ['핫도그', 2500, 'food'],
    ['아이스티', 1500, 'drink'], ['핫초코', 2000, 'drink'],
  ];

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* 저장소를 못 쓰는 환경 */ }
    const menu = {};
    seedMenu.forEach(([name, price, category], i) => {
      const id = 'm' + (i + 1);
      menu[id] = { id, name, price, category, soldOut: false, order: i, description: '' };
    });
    return { menu, orders: {}, users: {}, counter: 0, settings: { open: true, notice: '' } };
  }
  let db = load();

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { /* 무시 */ }
    emit();
  }
  function emit() { listeners.forEach(fn => fn()); }

  // 다른 탭(예: 소비자 탭과 관리자 탭)에서 바뀐 값도 받아온다
  window.addEventListener('storage', e => {
    if (e.key === KEY) { db = load(); emit(); }
  });

  function watch(compute, cb) {
    const run = () => cb(compute());
    listeners.add(run);
    setTimeout(run, 0);
    return () => listeners.delete(run);
  }

  const authListeners = new Set();
  function readAuth() {
    try { return JSON.parse(sessionStorage.getItem(AUTH_KEY)) || null; } catch (e) { return null; }
  }
  let authUser = readAuth();
  function setAuth(u) {
    authUser = u;
    try {
      if (u) sessionStorage.setItem(AUTH_KEY, JSON.stringify(u));
      else sessionStorage.removeItem(AUTH_KEY);
    } catch (e) { /* 무시 */ }
    authListeners.forEach(fn => fn(u));
  }
  function demoUid(email) {
    let h = 0;
    for (const c of email) h = (h * 31 + c.charCodeAt(0)) | 0;
    return 'demo_' + Math.abs(h).toString(36);
  }
  function loginAs(email, name) {
    const uid = demoUid(email);
    if (!db.users[uid]) {
      db.users[uid] = { uid, email, name: name || email.split('@')[0], createdAt: Date.now() };
      save();
    }
    setAuth({ uid, email, displayName: db.users[uid].name });
    return authUser;
  }

  return {
    onAuth(cb) { authListeners.add(cb); setTimeout(() => cb(authUser), 0); return () => authListeners.delete(cb); },
    get user() { return authUser; },
    async signInGoogle() { return loginAs('demo.student@example.com', '데모 학생'); },
    async signInEmail(email) { return loginAs(email.trim().toLowerCase()); },
    async signUpEmail(email) { return loginAs(email.trim().toLowerCase()); },
    async signOut() { setAuth(null); },
    // 데모 전용: 관리자 화면을 바로 써 볼 수 있게 관리자 계정으로 들어간다
    async demoAdminLogin() {
      // 로그인 알림이 나가기 전에 역할부터 넣어 둬야 권한 확인이 통과한다
      const email = 'demo.admin@example.com';
      const uid = demoUid(email);
      db.users[uid] = { ...(db.users[uid] || { uid, email, name: '데모 관리자', createdAt: Date.now() }), role: 'admin' };
      save();
      return loginAs(email);
    },

    async getProfile(uid) { return db.users[uid] || null; },
    async saveProfile(uid, data) {
      const { role, ...rest } = data; // 역할은 여기서 못 바꾼다 (실제 규칙과 같게)
      db.users[uid] = { ...(db.users[uid] || { uid }), ...rest };
      save();
    },
    async getRole(uid) { return (db.users[uid] && db.users[uid].role) || ''; },
    watchUsers(cb) { return watch(() => Object.values(db.users).sort((a, b) => (a.email || '').localeCompare(b.email || '')), cb); },
    async setRole(uid, role) { db.users[uid].role = role || ''; if (!role) delete db.users[uid].role; save(); },

    watchSettings(cb) { return watch(() => ({ ...db.settings }), cb); },
    async updateSettings(patch) { db.settings = { ...db.settings, ...patch }; save(); },

    watchMenu(cb) { return watch(() => Object.values(db.menu).sort((a, b) => a.order - b.order), cb); },
    async addMenu(item) {
      const id = 'm' + Date.now().toString(36);
      const order = Math.max(-1, ...Object.values(db.menu).map(m => m.order)) + 1;
      db.menu[id] = { id, soldOut: false, description: '', category: 'food', order, ...item };
      save();
    },
    async updateMenu(id, patch) { db.menu[id] = { ...db.menu[id], ...patch }; save(); },
    async deleteMenu(id) { delete db.menu[id]; save(); },

    async placeOrder(order) {
      db.counter += 1;
      const id = 'o' + Date.now().toString(36);
      const now = Date.now();
      db.orders[id] = { ...order, id, number: db.counter, status: 'pending', paid: false, createdAt: now, updatedAt: now };
      save();
      return { id, number: db.counter };
    },
    watchMyOrders(uid, cb) { return watch(() => sortNewest(Object.values(db.orders).filter(o => o.uid === uid)), cb); },
    watchAllOrders(cb) { return watch(() => sortNewest(Object.values(db.orders)), cb); },
    async updateOrder(id, patch) { db.orders[id] = { ...db.orders[id], ...patch, updatedAt: Date.now() }; save(); },
    async cancelMyOrder(id) {
      const o = db.orders[id];
      if (!o || o.status !== 'pending') throw new Error('이미 처리 중인 주문은 취소할 수 없습니다.');
      o.status = 'cancelled'; o.updatedAt = Date.now(); save();
    },
    async deleteOrder(id) { delete db.orders[id]; save(); },
    async resetDemo() { localStorage.removeItem(KEY); db = load(); save(); },
  };
}

/* ---------------- Firebase 모드 ---------------- */

async function makeFirebaseStore() {
  const V = '11.9.1';
  const base = `https://www.gstatic.com/firebasejs/${V}/`;
  const [{ initializeApp }, A, F] = await Promise.all([
    import(base + 'firebase-app.js'),
    import(base + 'firebase-auth.js'),
    import(base + 'firebase-firestore.js'),
  ]);
  const app = initializeApp(firebaseConfig);
  const auth = A.getAuth(app);
  const fs = F.getFirestore(app);

  const ts = v => (v && typeof v.toMillis === 'function' ? v.toMillis() : v || 0);
  const fromSnap = d => {
    const data = d.data({ serverTimestamps: 'estimate' });
    return { ...data, id: d.id, createdAt: ts(data.createdAt), updatedAt: ts(data.updatedAt) };
  };
  const listOf = (q, cb, onErr) => F.onSnapshot(q, s => cb(s.docs.map(fromSnap)), onErr || (e => console.error(e)));

  let current = null;

  return {
    onAuth(cb) { return A.onAuthStateChanged(auth, u => { current = u; cb(u); }); },
    get user() { return current; },
    async signInGoogle() {
      const p = new A.GoogleAuthProvider();
      p.setCustomParameters({ prompt: 'select_account' });
      return (await A.signInWithPopup(auth, p)).user;
    },
    async signInEmail(email, pw) { return (await A.signInWithEmailAndPassword(auth, email.trim(), pw)).user; },
    async signUpEmail(email, pw) { return (await A.createUserWithEmailAndPassword(auth, email.trim(), pw)).user; },
    async signOut() { await A.signOut(auth); },

    async getProfile(uid) {
      const s = await F.getDoc(F.doc(fs, 'users', uid));
      return s.exists() ? { ...s.data(), uid } : null;
    },
    async saveProfile(uid, data) {
      const { role, ...rest } = data;
      await F.setDoc(F.doc(fs, 'users', uid), { ...rest, uid, updatedAt: F.serverTimestamp() }, { merge: true });
    },
    async getRole(uid) {
      const s = await F.getDoc(F.doc(fs, 'users', uid));
      return (s.exists() && s.data().role) || '';
    },
    watchUsers(cb) { return listOf(F.query(F.collection(fs, 'users'), F.limit(500)), cb); },
    async setRole(uid, role) {
      await F.updateDoc(F.doc(fs, 'users', uid), { role: role ? role : F.deleteField() });
    },

    watchSettings(cb) {
      return F.onSnapshot(F.doc(fs, 'meta', 'settings'), s => cb(s.exists() ? s.data() : {}), e => { console.error(e); cb({}); });
    },
    async updateSettings(patch) { await F.setDoc(F.doc(fs, 'meta', 'settings'), patch, { merge: true }); },

    watchMenu(cb) { return listOf(F.query(F.collection(fs, 'menu'), F.orderBy('order')), cb); },
    async addMenu(item) {
      await F.addDoc(F.collection(fs, 'menu'), { soldOut: false, description: '', category: 'food', order: Date.now(), ...item });
    },
    async updateMenu(id, patch) { await F.updateDoc(F.doc(fs, 'menu', id), patch); },
    async deleteMenu(id) { await F.deleteDoc(F.doc(fs, 'menu', id)); },

    // 주문 번호는 meta/counter 문서를 트랜잭션으로 1씩 올려서 붙인다
    async placeOrder(order) {
      const counterRef = F.doc(fs, 'meta', 'counter');
      const orderRef = F.doc(F.collection(fs, 'orders'));
      const number = await F.runTransaction(fs, async tx => {
        const c = await tx.get(counterRef);
        const n = (c.exists() ? c.data().n : 0) + 1;
        tx.set(counterRef, { n });
        tx.set(orderRef, {
          ...order, number: n, status: 'pending', paid: false,
          createdAt: F.serverTimestamp(), updatedAt: F.serverTimestamp(),
        });
        return n;
      });
      return { id: orderRef.id, number };
    },
    // 내 주문은 email이 아니라 uid로 찾는다 (작년 앱은 email로 찾아서 이메일 없는 계정이 막혔다)
    watchMyOrders(uid, cb) {
      return listOf(F.query(F.collection(fs, 'orders'), F.where('uid', '==', uid)), l => cb(sortNewest(l)));
    },
    watchAllOrders(cb, onErr) {
      return listOf(F.query(F.collection(fs, 'orders'), F.orderBy('createdAt', 'desc'), F.limit(500)), cb, onErr);
    },
    async updateOrder(id, patch) { await F.updateDoc(F.doc(fs, 'orders', id), { ...patch, updatedAt: F.serverTimestamp() }); },
    async cancelMyOrder(id) {
      await F.updateDoc(F.doc(fs, 'orders', id), { status: 'cancelled', updatedAt: F.serverTimestamp() });
    },
    async deleteOrder(id) { await F.deleteDoc(F.doc(fs, 'orders', id)); },
  };
}

export const store = DEMO ? makeDemoStore() : await makeFirebaseStore();
