// 사진 댓글. 펀드 앱과 같은 Firebase 프로젝트(js/config.js)의 photo_comments 컬렉션에 저장한다.
// 로그인 없이 누구나 읽고 쓸 수 있고, 지우는 건 펀드 담당자와 개발자만 된다 (firestore.rules 참고).
//
// 문서 모양: { page: 'grade-9' | 'daily', photoId: 'grade-9/사진파일이름', name: '' (익명이면 빈칸), text, createdAt }
// 사진 파일 이름을 바꾸면 그 사진에 달린 댓글은 안 보이게 된다 (photoId가 파일 이름이라서).
import { firebaseConfig, PREVIEW } from '../js/config.js';

export const COMMENTS_ON = !!firebaseConfig && !PREVIEW;

const V = '11.9.1';
let ready = null;
let F = null;
let db = null;

function init() {
  if (!COMMENTS_ON) return Promise.reject(new Error('off'));
  if (!ready) {
    ready = (async () => {
      const base = `https://www.gstatic.com/firebasejs/${V}/`;
      const [{ initializeApp }, Fm] = await Promise.all([
        import(base + 'firebase-app.js'),
        import(base + 'firebase-firestore.js'),
      ]);
      const app = initializeApp(firebaseConfig, 'about-comments');
      F = Fm;
      db = F.getFirestore(app);
    })();
  }
  return ready;
}

// 한 페이지의 댓글을 실시간으로 받는다. cb(list) 는 바뀔 때마다 다시 불린다.
export async function watchPage(page, cb, onErr) {
  await init();
  const q = F.query(F.collection(db, 'photo_comments'), F.where('page', '==', page));
  return F.onSnapshot(q, snap => {
    const list = snap.docs.map(d => {
      const data = d.data({ serverTimestamps: 'estimate' });
      const t = data.createdAt;
      return { id: d.id, ...data, createdAt: t && t.toMillis ? t.toMillis() : 0 };
    });
    list.sort((a, b) => a.createdAt - b.createdAt);
    cb(list);
  }, onErr);
}

export async function addComment({ page, photoId, name, text }) {
  await init();
  await F.addDoc(F.collection(db, 'photo_comments'), {
    page, photoId, name, text, createdAt: F.serverTimestamp(),
  });
}
