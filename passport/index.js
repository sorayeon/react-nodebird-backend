const passport = require('passport');
const local = require('./local');
const {User} = require('../models');
// passport 로그인 전략 (id/pw, facebook, kakao ...)
// passport-local (id/pw)
// npm i passport passport-local
module.exports = () => {
  // session 에는 id만 저장
  passport.serializeUser((user, done) => {
    done(null, user.id);
  })
  // 복원 할 때는 DB 에서 복원
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findOne({where: { id }});
      done(null, user); // req.user
    } catch(error) {
      console.error(error);
      done(error);
    }
  })

  local();
}

// 프론트에서 서버로는 cookie만 보내요(clhxy)
// 서버가 쿠키파서, 익스프레스 세션으로 쿠키 검사 후 id: 1 발견
// id: 1이 deserializeUser에 들어감
// req.user로 사용자 정보가 들어감

// 요청 보낼때마다 deserializeUser가 실행됨(db 요청 1번씩 실행)
// 실무에서는 deserializeUser 결과물 캐싱