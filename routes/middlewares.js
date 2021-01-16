exports.authenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    // next() 다음 미들웨어로 이동
    // next(err) 에러 처리
    next();
  } else {
    res.status(401).send('로그인이 필요합니다.');
  }
};
exports.notAuthenticated = (req, res, next) => {
  if (!req.isAuthenticated()) {
    next();
  } else {
    res.status(401).send('로그인하지 않은 사용자만 접근 가능합니다.');
  }
};
