// 행사 정보. 해마다 여기만 바꾸면 된다.
export const SHOP = {
  title: '벌티 펀드',
  subtitle: '2026 버라이어티 쇼 펀드 주문',
  // 계좌이체 안내 문구. 비워 두면 계좌이체 선택지가 사라진다.
  bankInfo: '우리은행 1002-347-866591 김강현',
  contact: '',             // 예: '문의: fund@example.com'
  instagram: '',           // 예: 'https://www.instagram.com/...'
  studentHint: '김강현 11B',
  locationHint: 'MH 301',
  // 주문을 받는 중인지. false면 소비자 화면에서 주문 버튼이 막힌다.
  // (관리자 화면의 '주문 받기' 스위치가 Firestore 값으로 이걸 덮어쓴다)
  defaultOpen: true,
};

// 개발자 이메일. 여기 적힌 구글 계정은 역할과 상관없이 모든 권한을 갖는다.
// firestore.rules 맨 위의 developerEmails() 목록도 똑같이 맞춰야 한다.
export const DEVELOPER_EMAILS = ['kanghyeon0229@gmail.com'];

// Firebase 콘솔 > 프로젝트 설정 > 내 앱(웹)에서 복사한 값. 비밀값이 아니라서 공개돼도 괜찮다.
// (막는 건 firestore.rules가 한다.) null로 바꾸면 데모 모드(이 브라우저 안에만 저장)로 돈다.
export const firebaseConfig = {
  apiKey: 'AIzaSyArdh2jQDWeIYQFdjyK3ZB8RKiyzN93JdM',
  authDomain: 'variety-fund-2026.firebaseapp.com',
  projectId: 'variety-fund-2026',
  storageBucket: 'variety-fund-2026.firebasestorage.app',
  messagingSenderId: '358110200216',
  appId: '1:358110200216:web:262b87ba2647512725abed',
};
