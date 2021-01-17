const express = require('express');
const cors = require('cors');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const passport = require('passport');
const dotenv = require('dotenv');
const morgan = require('morgan');
const path = require('path');
const hpp = require('hpp');
const helmet = require('helmet');
const postRouter = require('./routes/post');
const postsRouter = require('./routes/posts');
const userRouter = require('./routes/user');
const hashtagRouter = require('./routes/hashtag');
const db = require('./models');
const passportConfig = require('./passport');

dotenv.config();
const app = express();
const SERVER_INFO = {frontUrl: ['http://localhost:3060'], port: 3065};

db.sequelize.sync()
  .then(() => {
    console.log('Mysql connect success. sequelize ready...')
  })
  .catch(console.error);

passportConfig();

if (process.env.NODE_ENV === 'production') {
  // 요청 기록 로깅 (combined: 접속자의 IP등 자세하게 로깅됨)
  app.use(morgan('combined'));
  app.use(hpp());
  app.use(helmet());
  SERVER_INFO.frontUrl = ['http://3.36.69.131'];
  SERVER_INFO.port = 80;

} else {
  // 요청 기록 로깅
  app.use(morgan('dev'));

}


// CORS
// Access to XMLHttpRequest at 'http://localhost:3065/user' from origin 'http://localhost:3060' has been blocked by CORS policy: Response to preflight request doesn't pass access control check: No 'Access-Control-Allow-Origin' header is present on the requested resource.
// 브라우저 -> backend 서버 정보(도메인, 포트)가 다른 경우 발생함
// (주의, front -> backend 서버로 보낼때는 발생하지 않음)
// 해결방법
// 1. Proxy 방식 (브라우저에서 front 서버로 보내서 -> backend 서버로 보내는 방법)
// 2. Access-Control-Allow-Origin header
//  npm i cors 미들웨어로 해결
//  origin: true 로 설정해 두면 보낸 곳의 주소가 자동으로 들어감
//  res.setHeader('Access-Control-Allow-Origin', '*') // 모든 서버 허용
//  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3060') // 3060포트에서 오는 요청 허용
app.use(cors({
  //요청 주소와 동일 http://localhost:3060, (true 옵션을 주면 같은 도메인)
  origin: SERVER_INFO.frontUrl,
  //front, backend 간 쿠키공유 (cors, axios 둘 다 true)
  // 주의) credentials: true 옵션에서는 origin: '*' 사용하지 못함
  credentials: true,
}));

// 정적 자원 (image)
app.use('/images', express.static(path.join(__dirname, 'uploads'))); // 경로 구분자 문제(window, linux) 때문에 join 을 사용

// 넘어온 data => json 일 때 req.body 담는다.
app.use(express.json());
// form(submit) 을 통해 넘어온 데이타를 req.body 담는다.
app.use(express.urlencoded({extended: true}));
// cookie 설정
app.use(cookieParser(process.env.COOKIE_SECRET));
// session 설정
app.use(session({
  saveUninitialized: false,
  resave: false,
  secret: process.env.COOKIE_SECRET,
}));
app.use(passport.initialize());
app.use(passport.session());

/*
app.get -> 가져오다
app.post -> 생성하다
app.patch -> 부분수정
app.delete -> 제거
app.put -> 전체수정
app.options -> 찔러보기 
app.head -> 헤더만 가져오기(헤더/바디)
*/
app.get('/', (req, res) => {
  res.send('Hello express');
});

app.use('/post', postRouter);
app.use('/posts', postsRouter);
app.use('/user', userRouter);
app.use('/hashtag', hashtagRouter);

// 에러 처리 미들웨어 (작성하지 않아요 기본 존재함)
// 기본 역할을 바꾸고 싶으면 따로 만들수 있음
// 에러페이지를 만들거나, 어떤 에러는 빼고 출력한다던거 할때 사용
// app.use((err, req, res, next) => { // 매개변수가 4개 임에 유의
//
// });

/*
npx pm2 start app.js : 서버시작
npx pm2 monit : 모니터
npx pm2 logs : 로그
npx pm2 logs --error : 에러로그
npx pm2 list : pm2 리스트
npx pm2 kill : kill
npx pm2 reload all : 재시작
*/

app.listen(SERVER_INFO.port, () => {
  console.log('서버 실행중');
});