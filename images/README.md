# images 폴더

사이트에 쓰는 그림은 전부 여기 있다. 종류별로 하위 폴더에 나눠 둔다.

- `logo/` 벌티 로고. 로고가 나오면 `logo.png`(정사각형, 512px 이상 권장)로 넣는다. 지금은 비어 있고 화면에는 "로고 자리" 점선 칸이 나온다.
- `app-icons/` 휴대폰 홈 화면 아이콘과 브라우저 탭 아이콘 (`icon-192.png`, `icon-512.png`). 로고가 나오면 같은 크기로 바꿔 넣는다.
- `menu/food/` 음식 메뉴 그림. 붕어빵, 떡볶이, 핫도그, 어묵꼬치, 김밥, 팝콘, 쿠키, 그리고 맞는 그림이 없을 때 쓰는 `default.svg`.
- `menu/drink/` 음료 메뉴 그림. 아이스티, 레몬에이드, 핫초코, 탄산음료, 생수, `default.svg`.
- `menu/index.json` 메뉴 그림 목록 (이름, 분류, 자동 연결 키워드).

## 메뉴에 그림 붙는 방식

1. 펀드·개발자 화면 메뉴 탭에서 "사진" 칸에 주소를 넣거나 목록에서 그림을 고르면 그 그림을 쓴다.
2. 비워 두면 메뉴 이름으로 찾는다. 예를 들어 이름에 "떡볶이"가 들어 있으면 `menu/food/tteokbokki.svg`가 붙는다.
3. 맞는 게 없으면 음식은 `menu/food/default.svg`, 음료는 `menu/drink/default.svg`.

## 새 그림 넣기

1. `menu/food/` 또는 `menu/drink/`에 파일을 넣는다. 정사각형 PNG, JPG, SVG 다 된다. 사진이면 600×600px, 200KB 이하로 줄여서 넣는다.
2. `js/menu-images.js`의 `MENU_IMAGES`와 `menu/index.json`에 한 줄씩 추가한다 (`path`, `name`, `category`, `keywords`).
3. 메뉴 관리 "사진" 목록에 바로 나온다.
