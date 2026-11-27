// 벌티 소개 페이지 내용. 이 파일만 고치면 모든 페이지에 반영된다.
// 빈칸('')으로 두면 페이지에 점선 "빈칸" 상자가 나온다. 따옴표 안에 글을 넣으면 된다.
// 줄을 바꾸고 싶으면 글 안에 \n 을 넣는다.
//
// 사진과 로고: about/img 폴더에 파일을 올리고, 그 파일 이름을 적는다.
// 예) logo: 'logo.png'  /  photo: '2025-stage.jpg'
// 파일 이름은 영어, 숫자, - 로만 짓는 게 안전하다.
// 비워 두면 점선 "사진 넣을 자리" 상자가 나온다.

export const SHOW = {
  title: '2026 버라이어티 쇼',
  subtitle: 'Anchor Point', // 올해 벌티 전체 주제
  question: '우리의 기준은 어디이며, 영혼의 닻을 어디에 내려야 하는가', // 주제 아래 한 줄
  date: '2026년 12월 28일',
  place: '한동대학교 효암 채플',
  logo: '',     // 벌티 로고. 첫 화면 왼쪽에 크게 나온다 (배경 투명한 png가 좋다)
  poster: '',   // 공연 포스터. 첫 화면 오른쪽에 나온다
};

// 대표 말씀 (성경 구절). '대표 말씀' 칸 맨 위에 나온다
export const VERSE = {
  text: '우리가 이 소망이 있는 것은 영혼의 닻 같아서 튼튼하고 견고하여 휘장 안에 들어 가나니',
  ref: '히브리서 6:19',
};

// 대표 말씀 아래 인사말 (교장 선생님, 담당 선생님 등). 비워 두면 안 나온다
export const GREETING = {
  name: '',  // 예: '서지훈'
  role: '',  // 예: '벌티 담당 선생님'
  photo: '', // 프로필 사진 (세로 사진, 2000 x 2600 비율이 가장 잘 맞는다)
  text: '',
};

// 벌티 역사
// intro: 역사 맨 위에 크게 나오는 한두 줄 / text: 그 아래 설명
// finale: 타임라인 아래 마지막 문단
export const HISTORY_INTRO = {
  intro: '',
  text: '',
  finale: '',
};

// 시기별 타임라인. 위에서부터 오래된 순서로. 시기를 더 넣거나 빼도 된다.
// period: 시기 제목 (예: '2015년 ~ 2019년') / desc: 그 시기 설명
// posters: 그 시기의 포스터들. 옆으로 계속 이어진다
//   photo: 포스터 파일 / title: 그해 벌티 제목 / year: 연도
export const HISTORY = [
  {
    period: '',
    desc: '',
    posters: [
      { photo: '', title: '', year: '' },
      { photo: '', title: '', year: '' },
      { photo: '', title: '', year: '' },
    ],
  },
  {
    period: '',
    desc: '',
    posters: [
      { photo: '', title: '', year: '' },
      { photo: '', title: '', year: '' },
    ],
  },
  {
    period: '2026년',
    desc: '',
    posters: [
      { photo: '', title: '', year: '2026' },
    ],
  },
];

// 팀 소개. 순서대로 나온다.
// what: 하는 일 / leaders: 팀장 / members: 팀원 (이름은 쉼표로 구분)
// byGrade: 학년마다 사람이 따로 있을 때 (학년리더 팀). 여기 적은 이름은 학년 페이지에도 나온다.
// 팀원 없이 leaders만 있으면 "담당"으로 나온다. wide: true 면 카드가 넓게 나온다.
export const TEAMS = [
  {
    name: '디렉터',
    what: '선생님 & 리더 소통',
    leaders: '김수훈',
  },
  {
    name: '부디렉터',
    wide: true,
    what: '스케줄 관리, 공연 세팅, 프로그램 편성, 영성 기도회, 조명, 진행, 스탭 영상, 브로셔 제작, 굿즈 제작, 장비 총괄 관리',
    members: '박현동, 이보리, 이해온, 이해인, 정하은',
  },
  {
    name: '학년 리더',
    what: '공연 아이템, 의상, 학년 소품, 대본, 학년 관리, 학년 영상 및 오디오 제작',
    byGrade: {
      7: '구하영, 김수인, 김영서, 박하준, 송연우, 이성은, 전동준',
      8: '김수현, 김찬양, 박주아, 박지호, 오가영, 오유민, 황태현',
      9: '김라엘, 김지완, 박별, 박성민, 장하은, 최로아, 최주영',
      10: '김은수, 데이사라, 이건희, 정다혜, 최고은, 한승수',
    },
  },
  {
    name: '홍보 / 촬영 영상 / 현장 데코',
    what: '홍보 영상(1~2개) 및 오프닝, 현수막, 현장 포토존, 현장 데코',
    leaders: '박지수, 장우성',
    members: '김강현, 김서희, 김수아, 김주니, 김하율, 박예하, 이시은, 한서현',
  },
  {
    name: '펀드 기획 판매',
    what: '메뉴 선정, 펀드 홍보, 판매, 배달, 수익',
    leaders: '남진후, 박이음',
    members: '김성준, 박하온, 서윤성, 이재휼, 임사랑, 정하연, 천현석, 최하진',
  },
];

// 학년별 내용. 7~12학년.
// theme: 주제 / story: 무슨 내용인지 / cover: 학년 페이지 맨 위 큰 사진 (가로 사진)
// highlights: 주요 볼거리. title(볼거리 이름)과 desc(설명). 개수 자유
// leader: 학년 리더의 말 / student: 대표 학생의 말 (photo는 세로 프로필 사진)
// photos: 연습 사진 모음. photo(파일)와 caption(사진 밑 설명). 개수 자유
//   학부모들이 사진마다 댓글을 달 수 있다. 사진 파일 이름을 나중에 바꾸면 그 사진의 댓글은 안 보이게 된다
function emptyGrade() {
  return {
    theme: '',
    story: '',
    cover: '',
    highlights: [
      { title: '', desc: '' },
      { title: '', desc: '' },
    ],
    leader: { name: '', text: '', photo: '' },
    student: { name: '', text: '', photo: '' },
    photos: [
      { photo: '', caption: '' },
      { photo: '', caption: '' },
      { photo: '', caption: '' },
      { photo: '', caption: '' },
    ],
  };
}

export const GRADES = {
  7: emptyGrade(),
  8: emptyGrade(),
  9: emptyGrade(),
  10: emptyGrade(),
  11: emptyGrade(),
  12: emptyGrade(),
};

// 매일 사진 (daily.html). 벌티가 시작하면 하루에 한 덩어리씩 추가한다.
// 새 날은 맨 위에 넣는다 (위에 있는 날이 페이지에서도 먼저 나온다).
// 사진은 about/img/daily 폴더에 올리고 'daily/파일이름' 으로 적는다.
// 사진을 누르면 학부모들이 댓글을 달 수 있다. 사진 파일 이름을 나중에 바꾸면 그 사진의 댓글은 안 보이게 되니 조심.
export const DAILY = [
  // {
  //   date: '12월 15일 (월)',
  //   title: '연습 1일차',
  //   note: '',
  //   photos: [
  //     { photo: 'daily/1215-1.jpg', caption: '9학년 첫 리허설' },
  //     { photo: 'daily/1215-2.jpg', caption: '' },
  //   ],
  // },
];

// 내용을 채울 때는 위의 emptyGrade() 대신 이렇게 직접 쓰면 된다:
// 7: {
//   theme: '우주 정거장',
//   story: '7학년이 ...',
//   cover: 'grade7-cover.jpg',
//   highlights: [
//     { title: '단체 칼군무', desc: '...' },
//     { title: '...', desc: '...' },
//   ],
//   leader: { name: '홍길동', text: '...', photo: 'grade7-leader.jpg' },
//   student: { name: '김철수', text: '...', photo: 'grade7-student.jpg' },
//   photos: [
//     { photo: 'grade7-1.jpg', caption: '첫 연습' },
//   ],
// },
