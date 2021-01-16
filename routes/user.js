const express = require('express');
const bcrypt = require('bcrypt');
const passport = require('passport');
const {Post, Comment, Image, User} = require('../models');
const {Op} = require('sequelize');
const { authenticated, notAuthenticated } = require('./middlewares');

const router = express.Router();

// GET /user
router.get('/', async (req, res, next) => {
  console.log(req.headers);
  try {
    if (req.user) {
      // attributes: ['id', 'nickname', 'email'], //가져오고 싶은 컬럼만 가지고 올수도 있음
      const fullUserWithoutPassword = await User.findOne({
        where: {id: req.user.id},
        attributes: {
          exclude: ['password'],
        },
        include: [{
          model: Post,
          attributes: ['id']
        }, {
          model: User,
          as: 'Followings',
          attributes: ['id'],
          through: { attributes: [] }
        }, {
          model: User,
          as: 'Followers',
          attributes: ['id'],
          through: { attributes: [] }
        }]
      });
      res.status(200).json(fullUserWithoutPassword);
    } else {
      res.status(200).json(null);
    }
  } catch (error) {
    console.error(error);
    next(error);
  }
});

// GET /user/1/posts
router.get('/:userId/posts', async (req, res, next) => {
  try {
    let where = { UserId: req.params.userId };
    if (parseInt(req.query.last, 10)) { // 초기 로딩이 아닐때
      where.id = { [Op.lt]: parseInt(req.query.last, 10) }; // lastId 보다 작은거
    } //
    const posts = await Post.findAll({
      where,
      limit: 10,
      // 실무에서는 offset 은 잘 쓰이지 않는다. (중간에 게시글이 추가/삭제 하는경우 문제 발생)
      // offset: 0, // offset: 0 -> 1~10, 10 -> 11~20, 100 -> 101~110
      order: [
        ['createdAt', 'DESC'],
        [Comment, 'createdAt', 'DESC'],
      ],
      include: [{
        model: User, // 게시글 작성자
        attributes: ['id', 'nickname'],
      }, {
        model: Image,
        attributes: ['id', 'src'],
      }, {
        model: Comment,
        attributes: ['id', 'content'],
        include: [{
          model: User, // 코맨트 작성자
          attributes: ['id', 'nickname'],
        }]
      }, {
        model: User, // 좋아요 누른사람
        as: 'Likers',
        attributes: ['id'],
        through: { attributes: [] }
      }, {
        model: Post,
        as: 'Retweet',
        include: [{
          model: User,
          attributes: ['id', 'nickname'],
        }, {
          model: Image,
        }]
      }]
    });
    res.status(200).json(posts);
  } catch (error) {
    console.error(error);
    next(error);
  }
});

// POST /user/login
// 로그인
router.post('/login', notAuthenticated, (req, res, next) => {
  // passport.authenticate 는 req, res, next 를 사용 할 수 없는 미들웨어인데
  // 미들웨어 확장을 통해 사용 할 수 있게 하는 기법
  // ('/login', (req, res, next) => { })(req, res, next);
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      console.error(err);
      return next(err);
    }
    if (info) {
      // status : 401 Unauthorized, 403 : Forbidden, 404 : NotFound
      return res.status(401).send(info.reason);
    }

    // 나중에는 세션 저장용 DB로 redis 를 사용합니다.
    return req.login(user, async (loginErr) => {
      if (loginErr) {
        console.error(loginErr);
        return next(loginErr);
      }

      // attributes: ['id', 'nickname', 'email'], //가져오고 싶은 컬럼만 가지고 올수도 있음
      const fullUserWithoutPassword = await User.findOne({
        where: {id: user.id},
        attributes: {
          exclude: ['password'],
        },
        include: [{
          model: Post,
          attributes: ['id'],
        }, {
          model: User,
          as: 'Followings',
          attributes: ['id'],
          through: { attributes: [] }
        }, {
          model: User,
          as: 'Followers',
          attributes: ['id'],
          through: { attributes: [] }
        }]
      });
      return res.status(200).json(fullUserWithoutPassword);
    });
  })(req, res, next);
});

// POST /user/logout
// 로그아웃
router.post('/logout', authenticated, (req, res) => {
  req.logout();
  req.session.destroy();
  res.send('ok');
});


// GET /user/followers
// 나를 팔로우 한사람 불러오기
router.get('/followers', authenticated, async (req, res, next) => {
  try {
    const user = await User.findOne({
      where: {id: req.user.id}
    });
    if (!user) {
      res.status(403).send('존재하지 않는 유저입니다.');
    }
    const followers = await user.getFollowers({
      limit: parseInt(req.query.limit, 10),
      attributes: ['id', 'nickname'],
    });
    res.status(200).json(followers);

  } catch(error) {
    console.error(error);
    next(error);
  }
});

// GET /user/followers
// 내가 팔로잉 한 사람 불러오기
router.get('/followings', authenticated, async (req, res, next) => {
  try {
    const user = await User.findOne({
      where: {id: req.user.id}
    });
    if (!user) {
      res.status(403).send('존재하지 않는 유저입니다.');
    }
    const followings = await user.getFollowings({
      limit: parseInt(req.query.limit, 10),
      attributes: ['id', 'nickname'],
    });
    res.status(200).json(followings);
  } catch(error) {
    console.error(error);
    next(error);
  }
});

// GET /user/1
router.get('/:userId', async (req, res, next) => {
  try {
    const fullUserWithoutPassword = await User.findOne({
      where: {id: req.params.userId},
      attributes: {
        exclude: ['password'],
      },
      include: [{
        model: Post,
        attributes: ['id']
      }, {
        model: User,
        as: 'Followings',
        attributes: ['id'],
        through: { attributes: [] }
      }, {
        model: User,
        as: 'Followers',
        attributes: ['id'],
        through: { attributes: [] }
      }]
    });
    if (fullUserWithoutPassword) {
      const data = fullUserWithoutPassword.toJSON();
      data.Posts = data.Posts.length;
      data.Followers = data.Followers.length;
      data.Followings = data.Followings.length;
      res.status(200).json(data);
    } else {
      res.status(404).json('존재하지 않는 사용자입니다.');
    }

  } catch (error) {
    console.error(error);
    next(error);
  }
});

// POST /user
// 회원가입
router.post('/', notAuthenticated, async (req, res, next) => {
  try {
    // email 중복검사
    const exUser = await User.findOne({
      where: {
        email: req.body.email,
      }
    });
    if (exUser) {
      // res.send 를 두번 보내기 않기 위해 return 을 붙여줌
      // Can't set headers already sent 에러가 발생함
      // 요청/응답은 헤더(상태, 용량, 시간, 쿠기)와 바디(데이터)로 구성됨
      // status 403 : 금지 (400번대는 클라이언트에서 잘못 보냄)
      return res.status(403).send('이미 사용 중인 아이디입니다.');
    }
    // hash(비밀번호, salt)
    // salt => 높을 수록 보안에 안전하지만 성능에 영향이 있다. 10~13 : 1초 정도 소요되는 숫자 추천
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    await User.create({
      email: req.body.email,
      nickname: req.body.nickname,
      password: hashedPassword,
    });
    // status 200 : 성공, 201 : 생성됨
    res.status(201).send('ok');
  } catch(error) {
    console.error(error);
    // status 500 : 에러 (500번대는 서버에서 처리하다 오류발생)
    next(error); // 에러를 한방에 처리하기 위해 다음으로 보냄
  }
});

// PATCH /nickname
// 닉네임변경
router.patch('/nickname', authenticated, async (req, res, next) => {
  try {
    await User.update({
      nickname: req.body.nickname,
    }, {
      where: {id: req.user.id}
    });
    res.status(200).json({
      nickname: req.body.nickname
    });
  } catch(error) {
    console.error(error);
    next(error);
  }
});

// PATCH /user/1/following
// 팔로우
router.patch('/:userId/following', authenticated, async (req, res, next) => {
  try {
    const user = await User.findOne({
      where: {
        id: req.params.userId
      }
    });
    if (!user) {
      res.status(403).send('존재하지 않는 유저를 팔로우 하고 있습니다.');
    }
    await user.addFollowers(req.user.id);
    res.status(200).json({
      UserId: user.id
    });
  } catch(error) {
    console.error(error);
    next(error);
  }
});

// DELETE /user/1/following
// 언팔로우
router.delete('/:userId/following', authenticated, async (req, res, next) => {
  try {
    const user = await User.findOne({
      where: {
        id: req.params.userId
      }
    });
    if (!user) {
      res.status(403).send('존재하지 않는 유저를 언팔로우 하고 있습니다.');
    }
    await user.removeFollowers(req.user.id);
    res.status(200).json({
      UserId: user.id
    });
  } catch(error) {
    console.error(error);
    next(error);
  }
});

// DELETE /user/1/follower
// 팔로우 삭제
router.delete('/:userId/follower', authenticated, async (req, res, next) => {
  try {
    const user = await User.findOne({
      where: {
        id: req.params.userId
      }
    });
    if (!user) {
      res.status(403).send('존재하지 않는 유저를 차단 하고 있습니다.');
    }
    await user.removeFollowings(req.user.id);
    res.status(200).json({
      UserId: user.id
    });
  } catch(error) {
    console.error(error);
    next(error);
  }
});

module.exports = router;