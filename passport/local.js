const passport = require('passport');
const { Strategy: LocalStrategy } = require('passport-local');
const bcrypt = require('bcrypt');
const { User } = require('../models');
module.exports = () => {
  passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password',
  }, async (email, password, done) => {
    console.log('LocalStrategy', email, password);
    try {
      const user = await User.findOne({
        where: { email }
      });
      if (!user) {
        // done 서버에러, 성공, 클라이언트에러
        return done(null, false, {reason: '존재하지 않는 사용자 입니다.'});
      }
      const result = await bcrypt.compare(password, user.password);
      if (result) {
        // done 서버에러, 성공
        return done(null, user); // 성공
      }
      // done 서버에러, 성공, 클라이언트에러
      return done(null, false, {reason: '비밀번호가 일치하지 않습니다.'});
    } catch (error) {
      console.error(error);
      return done(error);
    }
  }));
};
