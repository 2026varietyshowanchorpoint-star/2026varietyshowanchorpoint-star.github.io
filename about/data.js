// 벌티 소개 페이지 내용. 이 파일만 고치면 모든 페이지에 반영된다.
// 빈칸('')으로 두면 페이지에 점선 "빈칸" 상자가 나온다. 따옴표 안에 글을 넣으면 된다.
// 줄을 바꾸고 싶으면 글 안에 \n 을 넣는다.

export const SHOW = {
  title: '2026 벌티',
  subtitle: '', // 예: 올해 벌티 전체 주제
  date: '',     // 예: '2026년 12월 19일 (토) 오후 6시'
  place: '',    // 예: '학교 대강당'
};

// 맨 처음에 나오는 대표 말씀 (교장 선생님, 담당 선생님 등)
export const GREETING = {
  name: '',  // 예: '서지훈'
  role: '',  // 예: '벌티 담당 선생님'
  text: '',
};

// 벌티 역사. 위에서부터 오래된 순서로. 줄을 더 넣거나 빼도 된다.
export const HISTORY = [
  { year: '', title: '', text: '' },
  { year: '', title: '', text: '' },
  { year: '', title: '', text: '' },
  { year: '2026', title: '', text: '' },
];

// 팀 소개. 팀 이름이 정해지면 바꾸고, 팀 수에 맞게 줄을 더하거나 뺀다.
// leader: 팀장 이름, members: 팀원 이름들 (쉼표로 구분)
export const TEAMS = [
  { name: '', what: '', leader: '', members: '' },
  { name: '', what: '', leader: '', members: '' },
  { name: '', what: '', leader: '', members: '' },
  { name: '', what: '', leader: '', members: '' },
];

// 학년별 내용. 7~12학년.
// theme: 주제 / story: 무슨 내용인지 / highlights: 주요 볼거리 (여러 개)
// leader: 학년 리더 / student: 대표 학생
function emptyGrade() {
  return {
    theme: '',
    story: '',
    highlights: ['', '', ''],
    leader: { name: '', text: '' },
    student: { name: '', text: '' },
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

// 내용을 채울 때는 위의 emptyGrade() 대신 이렇게 직접 쓰면 된다:
// 7: {
//   theme: '우주 정거장',
//   story: '7학년이 ...',
//   highlights: ['단체 칼군무', '...'],
//   leader: { name: '홍길동', text: '...' },
//   student: { name: '김철수', text: '...' },
// },
