// 행사 정보. 해마다 여기만 바꾸면 된다.
export const SHOP = {
  title: '벌티 펀드',
  subtitle: '2026 버라이어티 쇼 펀드 주문',
  // 계좌이체 안내 문구. 비워 두면 계좌이체 선택지가 사라진다.
  bankInfo: '우리은행 1002-347-866591 김강현',
  contact: '',             // 예: '문의: fund@example.com'
  instagram: '',           // 예: 'https://www.instagram.com/...'
  studentHint: '김강현 11B',
  locationHint: 'MH 303',
  // 주문을 받는 중인지. false면 소비자 화면에서 주문 버튼이 막힌다.
  // (관리자 화면의 '주문 받기' 스위치가 Firestore 값으로 이걸 덮어쓴다)
  defaultOpen: true,
  orderSound: 'sounds/baedalyi-minjog.mp3',
  // 비밀번호를 잊었을 때 로그인 창에 나오는 문의 방법. 비워 두면 그 줄은 안 나온다.
  helpEmail: 'kanghyeon0229@gmail.com',
  helpPhone: '',           // 예: '010-0000-0000'
  helpVisit: '개발자에게 직접 찾아와서 물어봐도 돼요.',
};

// 미리보기 모드: true면 로그인 없이 세 화면이 다 열리고, 데이터는 그 브라우저에만 저장된다 (Firebase를 안 씀).
// Firebase 프로젝트가 정지된 동안 디자인을 보려고 켜 두었다. 다시 실제로 쓸 때 false로 바꾼다.
export const PREVIEW = false;

// 개발자 이메일. 여기 적힌 구글 계정은 역할과 상관없이 모든 권한을 갖는다.
// firestore.rules 맨 위의 developerEmails() 목록도 똑같이 맞춰야 한다.
export const DEVELOPER_EMAILS = ['kanghyeon0229@gmail.com'];

// Firebase 콘솔 > 프로젝트 설정 > 내 앱(웹)에서 복사한 값. 비밀값이 아니라서 공개돼도 괜찮다.
// (막는 건 firestore.rules가 한다.) null로 바꾸면 데모 모드(이 브라우저 안에만 저장)로 돈다.
export const firebaseConfig = {
  apiKey: 'AIzaSyDWFqblFD53V5_Rxv0NUqQe3_JrZsua4U8',
  authDomain: 'bulti-fund-2026.firebaseapp.com',
  projectId: 'bulti-fund-2026',
  storageBucket: 'bulti-fund-2026.firebasestorage.app',
  messagingSenderId: '993658741599',
  appId: '1:993658741599:web:e112aa934b3e23fc9d0cea',
};
