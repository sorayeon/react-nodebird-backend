const express = require('express');
const {Op} = require('sequelize');
const {Post, Comment, Image, User} = require('../models');
const { authenticated } = require('./middlewares');

const router = express.Router();

// GET /posts
router.get('/', async (req, res, next) => {
  try {
    let where = {};
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
        attributes: ['id', 'content', 'createdAt'],
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

// GET /posts/related
router.get('/related', authenticated, async (req, res, next) => {
  try {
    const following = await User.findAll({
      attributes: ['id'],
      include: [{
        model: User,
        as: 'Followers',
        where: { id: req.user.id }
      }]
    });
    let where = {
      UserId: {[Op.in]: following.map((v) => v.id).concat(req.user.id)}
      // UserId: {[Op.notIn]: following.map((v) => v.id)} // 팔로잉 하지 않은사람 게시글만 가져옴
      // UserId: { [Op.in]: Sequelize.literal('SELECT ID FROM...') } 서브쿼리 이용하는 방법
    };
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
        attributes: ['id', 'content', 'createdAt'],
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

module.exports = router;