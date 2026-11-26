// 메뉴 그림 목록 (images/menu 폴더). 새 그림을 넣으면 여기와 images/menu/index.json에 한 줄 추가한다.
// keywords: 메뉴 이름에 이 글자가 들어 있으면 사진을 안 넣어도 이 그림이 자동으로 붙는다.
export const MENU_IMAGES = [
  {
    "path": "images/menu/food/bungeoppang.svg",
    "name": "붕어빵",
    "category": "food",
    "keywords": [
      "붕어빵",
      "붕어"
    ]
  },
  {
    "path": "images/menu/food/tteokbokki.svg",
    "name": "떡볶이",
    "category": "food",
    "keywords": [
      "떡볶이",
      "떡볶",
      "떡"
    ]
  },
  {
    "path": "images/menu/food/hotdog.svg",
    "name": "핫도그",
    "category": "food",
    "keywords": [
      "핫도그",
      "핫독",
      "콘도그",
      "소시지"
    ]
  },
  {
    "path": "images/menu/food/eomuk.svg",
    "name": "어묵꼬치",
    "category": "food",
    "keywords": [
      "어묵",
      "오뎅",
      "꼬치"
    ]
  },
  {
    "path": "images/menu/food/gimbap.svg",
    "name": "김밥",
    "category": "food",
    "keywords": [
      "김밥",
      "김"
    ]
  },
  {
    "path": "images/menu/food/popcorn.svg",
    "name": "팝콘",
    "category": "food",
    "keywords": [
      "팝콘"
    ]
  },
  {
    "path": "images/menu/food/cookie.svg",
    "name": "쿠키",
    "category": "food",
    "keywords": [
      "쿠키",
      "과자"
    ]
  },
  {
    "path": "images/menu/food/default.svg",
    "name": "음식 기본",
    "category": "food",
    "keywords": []
  },
  {
    "path": "images/menu/drink/icedtea.svg",
    "name": "아이스티",
    "category": "drink",
    "keywords": [
      "아이스티",
      "티",
      "차",
      "tea"
    ]
  },
  {
    "path": "images/menu/drink/lemonade.svg",
    "name": "레몬에이드",
    "category": "drink",
    "keywords": [
      "레몬",
      "에이드",
      "레모네이드"
    ]
  },
  {
    "path": "images/menu/drink/hotchoco.svg",
    "name": "핫초코",
    "category": "drink",
    "keywords": [
      "핫초코",
      "초코",
      "코코아",
      "라떼",
      "커피"
    ]
  },
  {
    "path": "images/menu/drink/soda.svg",
    "name": "탄산음료",
    "category": "drink",
    "keywords": [
      "콜라",
      "사이다",
      "탄산",
      "환타",
      "소다",
      "음료수"
    ]
  },
  {
    "path": "images/menu/drink/water.svg",
    "name": "생수",
    "category": "drink",
    "keywords": [
      "물",
      "생수",
      "water"
    ]
  },
  {
    "path": "images/menu/drink/default.svg",
    "name": "음료 기본",
    "category": "drink",
    "keywords": []
  }
];

// 메뉴에 쓸 그림 주소: 직접 넣은 사진 > 이름으로 찾은 그림 > 분류별 기본 그림
export function menuImage(m) {
  if (m.imageUrl) return m.imageUrl;
  const name = (m.name || '').replace(/\s/g, '');
  // 긴 키워드부터 비교해서 '김'보다 '김밥'이 먼저 맞게
  const hits = [];
  MENU_IMAGES.forEach(img => img.keywords.forEach(k => { if (name.includes(k)) hits.push([k.length, img.path]); }));
  if (hits.length) return hits.sort((a, b) => b[0] - a[0])[0][1];
  return m.category === 'drink' ? 'images/menu/drink/default.svg' : 'images/menu/food/default.svg';
}
