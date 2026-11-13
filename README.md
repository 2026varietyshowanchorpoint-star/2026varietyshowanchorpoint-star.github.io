# 벌티 펀드 주문

벌티(버라이어티 쇼) 펀드 음식 주문을 받는 웹앱이다. 2025년 앱에서 주문 기능만 떼어 새로 만들었다.

- `index.html`: 주문하는 학생용 화면. 메뉴 고르기, 주문서, 내 주문 상태 확인.
- `admin.html`: 펀드 담당자용 화면. 주문 처리, 입금 확인, 메뉴/품절 관리, 매출, 역할 관리.

빌드 과정이 없는 HTML/JS라서 파일을 그대로 올리면 된다. 휴대폰에서 열고 "홈 화면에 추가"를 누르면 앱처럼 쓸 수 있다.

## 바로 써 보기 (데모 모드)

`js/config.js`의 `firebaseConfig`가 `null`이면 데모 모드로 돈다. 주문과 메뉴가 그 브라우저 안에만 저장된다.

1. https://kanghyeon0220.github.io/fund-demo/ 를 연다. GitHub Pages는 `gh-pages` 브랜치에서 나간다. 코드를 고치면 `main`과 `gh-pages` 둘 다에 올려야 사이트에 반영된다 (`git push origin main main:gh-pages`).
2. 메뉴를 고르고 주문한다.
3. 같은 브라우저 다른 탭에서 `admin.html`을 열고 "데모 관리자로 들어가기"를 누른다. 방금 한 주문이 보인다.
4. 관리자 탭에서 상태를 바꾸면 주문 탭에 알림이 뜬다.

컴퓨터에서 직접 열 때는 `index.html`을 더블클릭하면 안 되고(모듈이 막힌다) 폴더에서 `python -m http.server`를 실행한 뒤 `http://localhost:8000`으로 연다.

## 실제로 쓰기 (Firebase 연결)

1. https://console.firebase.google.com 에서 새 프로젝트를 만든다.
2. Authentication > 로그인 방법에서 Google과 이메일/비밀번호를 켠다.
3. Firestore Database를 만든다 (위치는 asia-northeast3 서울).
4. 프로젝트 설정 > 내 앱 > 웹 앱 추가. 나오는 설정값을 `js/config.js`의 `firebaseConfig`에 붙여 넣는다.
5. `firestore.rules` 내용을 Firestore > 규칙 탭에 붙여 넣고 게시한다. 이걸 빼먹으면 아무나 남의 주문을 볼 수 있다.
6. GitHub Pages로 올렸다면 Authentication > 설정 > 승인된 도메인에 `아이디.github.io`를 추가한다. 안 하면 구글 로그인이 막힌다.
7. 첫 관리자 만들기: 사이트에서 한 번 로그인한 뒤, Firestore 콘솔의 `users` 컬렉션에서 내 문서를 열고 `role` 필드(문자열)를 `admin`으로 직접 추가한다. 그다음부터는 관리자 화면의 사용자 탭에서 다른 사람에게 역할을 줄 수 있다.
8. `js/config.js`의 `SHOP`에 계좌 정보, 문의처, 인스타그램 주소를 넣는다. `bankInfo`가 비어 있으면 계좌이체 선택지가 안 보인다.

Firebase Hosting을 쓰고 싶으면 `npm i -g firebase-tools` 후 `firebase login`, `firebase use --add`, `firebase deploy`를 하면 된다. `firebase.json`이 이미 있어서 규칙과 사이트가 같이 올라간다.

## 역할

| 역할 | 할 수 있는 일 |
|---|---|
| 없음 (일반) | 주문, 내 주문 보기, 접수됨 상태일 때 취소 |
| `staff` | 모든 주문 보기, 상태 변경, 입금 확인, 메뉴 수정, 주문 받기 켜고 끄기 |
| `admin` | staff 권한 전부, 역할 주기, 주문 삭제 |

주문 상태는 접수됨 > 만드는 중 > 배달 중 또는 픽업 대기 > 완료 순서로 간다. 취소도 있다.

## 2025년 앱에서 바꾼 점

- 권한 확인을 화면 코드에만 두지 않고 `firestore.rules`에서 서버가 막는다. 작년에는 규칙이 느슨하면 누구든 자기 role을 developer로 바꿀 수 있는 구조였다.
- 사용자는 자기 role을 못 바꾼다. admin만 남의 role을 바꿀 수 있다.
- 내 주문을 이메일이 아니라 uid로 찾는다. 이메일 없는 계정도 주문 내역이 보인다.
- 주문마다 #1, #2 같은 번호가 붙는다. 픽업할 때 번호로 부르면 된다.
- 계좌이체 주문에 입금 확인 버튼이 있고, 매출 탭에 입금 안 된 금액이 따로 나온다.
- 현금 주문에 낸 금액을 적으면 관리자 화면에 거스름돈이 계산돼서 나온다.
- 주문 받기 스위치와 공지 칸이 생겼다.
- 매출 탭에서 메뉴별 판매량을 보고, 전체 주문을 CSV(엑셀)로 받을 수 있다.

## 알림에 대해

작년 웹 버전은 FCM 웹 푸시 키 자리에 `YOUR_PUBLIC_VAPID_KEY`가 그대로 들어가 있어서 웹 알림이 안 갔다. 이번 버전은 FCM을 쓰지 않는다. 페이지가 열려 있으면 Firestore 실시간 연결로 상태 변화를 바로 받아서 화면 알림과 브라우저 알림을 띄운다. 관리자 화면은 새 주문이 들어오면 소리가 난다.

화면을 완전히 닫은 상태에서도 휴대폰 푸시를 받게 하려면 Cloud Functions(유료 Blaze 요금제 필요)와 FCM을 붙여야 한다. 필요해지면 그때 추가한다.

## 파일

```
index.html, admin.html   화면
js/config.js             행사 정보와 Firebase 설정 (해마다 여기만 고치면 된다)
js/store.js              데이터 읽고 쓰기 (Firebase 모드 / 데모 모드)
js/app.js                학생용 화면 동작
js/admin.js              관리자 화면 동작
js/ui.js                 공통 함수 (상태 이름, 금액 표시, 알림)
css/style.css            디자인
firestore.rules          보안 규칙
manifest.json, sw.js     홈 화면 앱(PWA)
```

## 남은 일

- 주문 금액은 주문하는 쪽 화면에서 계산한다. 규칙이 금액이 메뉴 가격과 맞는지까지는 확인하지 않으니, 관리자가 주문을 받을 때 금액을 한 번 보면 된다. 확실히 막으려면 Cloud Functions로 서버에서 다시 계산해야 한다.
- 메뉴 사진은 주소(URL)로 넣는다. 사진 업로드가 필요하면 Firebase Storage를 붙인다.
