const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const multerS3 = require('multer-s3');
const AWS = require('aws-sdk');

const {Post, Image, Comment, User, Hashtag} = require('../models');
const { authenticated } = require('./middlewares');

const router = express.Router();

// GET /post/1
router.get('/:postId', async (req, res, next) => {
  try {
    const post = await Post.findOne({
      where: {id: req.params.postId}
    });

    if (!post) {
      return res.status(403).send('존재하지 않는 게시글 입니다.');
    }
    const fullPost = await Post.findOne({
      where : { id: post.id},
      limit: 10,
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
    res.status(200).json(fullPost);
  } catch (error) {
    console.error(error);
    next(error);
  }

});

// POST /post/images
// upload.array('image')
// upload.single('image')
// upload.none()

// aws s3
/* 버킷을 public 으로 만들고 정책 추가
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "AddPerm",
            "Effect": "Allow",
            "Principal": "*",
            "Action": [
                "s3:GetObject",
                "s3:PutObject"
            ],
            "Resource": "arn:aws:s3:::react-nodebird-images/*"
        }
    ]
}
보안 내 자격 증명 -> 새 액세스 키 발급 (key, secret 를 .env 에 저장)
npm i aws-sdk multer-s3
*/
AWS.config.update({
  accessKeyId: process.env.AWSAccessKeyId,
  secretAccessKey: process.env.AWSSecretKey,
  region: 'ap-northeast-2'
});
const upload = multer({
  storage: process.env.NODE_ENV === 'production'
    ? multerS3({
      s3: new AWS.S3(),
      bucket: 'react-nodebird-images',
      key(req, file, done) {
        done(null, `original/${req.user.id}/${Date.now()}_${path.basename(file.originalname)}`);
      }
    })
    : multer.diskStorage({
    destination(req, file, done) {
      try {
        fs.accessSync(`uploads/${req.user.id}`);
      } catch (error) {
        console.log(error);
        fs.mkdirSync(`uploads/${req.user.id}`);
        console.log('mkdir uploads... create');
      }
      done(null, `uploads/${req.user.id}`);
    },
    filename(req, file, done) { // 소라연.png
      const ext = path.extname(file.originalname); // 확장차 추출(png)
      const basename = path.basename(file.originalname, ext); // 소라연
      done(null, basename + '_' + new Date().getTime() + ext); // 소라연_23291919.png
    }
  }),
  limit: {fileSize: 10 * 1024 * 1024} // 10MB
});

// POST /post
// 게시글 작성
router.post('/', authenticated, upload.none(), async (req, res, next) => {
  try {
    const hashtags = req.body.content.match(/#[^\s#]+/g);
    const post = await Post.create({
      content: req.body.content,
      UserId: req.user.id,
    });
    if (hashtags) {
      const result = await Promise.all(hashtags.map((tag) => Hashtag.findOrCreate({
        where: {name: tag.slice(1).toLowerCase()},
      }))); // [[#노드, true], [#리액트, true]]
      await post.addHashtags(result.map(v => v[0]));
    }
    if (req.body.image) {
      if (Array.isArray(req.body.image)) { // 이미지를 여러개 올리면 image: [랑.png, 솔.png, 연.png]
        const images = await Promise.all(req.body.image.map((image) => Image.create({src: image})));
        await post.addImages(images);
      } else { // 이미지를 하나만 올리면 image: 소라연.png
        const image = await Image.create({src: req.body.image});
        await post.addImages(image);
      }
    }
    const fullPost = await Post.findOne({
      where: {
        id: post.id
      },
      include: [{
        model: User, // 게시글 작성자
        attributes: ['id', 'nickname'],
      }, {
        model: Image,
      }, {
        model: Comment,
        attributes: ['id', 'content', 'createdAt'],
        include: [{
          model: User, // 댓글 작성자
          attributes: ['id', 'nickname'],
        }],
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

    res.status(201).json(fullPost);

  } catch (error) {
    console.log(error);
    next(error);
  }
});


router.post('/images', authenticated, upload.array('image'), async (req, res) => {
  console.log(req.files);
  res.json(req.files.map((v) => process.env.NODE_ENV === 'production' ? v.location : v.filename));
});

// POST /post/1/comment
// 댓글 작성
router.post('/:postId/comment', authenticated, async (req, res, next) => {
  try {
    const post = await Post.findOne({
      where: {id: req.params.postId}
    });

    if (!post) {
      return res.status(403).send('존재하지 않는 게시글 입니다.');
    }

    const comment = await Comment.create({
      content: req.body.content,
      PostId: parseInt(req.params.postId, 10),
      UserId: req.user.id,
    });
    const fullComment = await Comment.findOne({
      where: {id: comment.id},
      include: [{
        model: User,
        attributes: ['id', 'nickname'],
      }],
    });

    res.status(201).json(fullComment);

  } catch (error) {
    console.log(error);
    next(error);
  }
});

// POST /post/1/retweet
// 리트윗 작성
router.post('/:postId/retweet', authenticated, async (req, res, next) => {
  try {
    const post = await Post.findOne({
      where: {id: req.params.postId},
      include: [{
        model: Post,
        as: 'Retweet',
      }]
    });

    if (!post) {
      return res.status(403).send('존재하지 않는 게시글 입니다.');
    }

    // 자기 자신의 글을 리트윗하거나
    // 자기 글을 리트윗한것을 다시 자기가 리트윗하는것은 막는다.
    if (post.UserId === req.user.id
      || (post.Retweet && post.Retweet.UserId === req.user.id)) {
      return res.status(403).send('자신의 글은 리트윗 할 수 없습니다.');
    }

    // 남의 게시글을 다른사람이 리트윗한것을 자신이 리트윗할수 있다
    const retweetTargetId = post.RetweetId || post.id;
    const exPost = await Post.findOne({
      where: {
        UserId: req.user.id,
        RetweetId: retweetTargetId,
      }
    });
    if (exPost) {
      return res.status(403).send('이미 리트윗 했습니다.');
    }

    const retweet = await Post.create({
      UserId: req.user.id,
      RetweetId: retweetTargetId,
      content: 'retweet',
    });

    const retweetWithPrevPost = await Post.findOne({
      where: {
        id: retweet.id
      },
      include: [{
        model: Post,
        as: 'Retweet',
        include: [{
          model: User,
          attributes: ['id', 'nickname'],
        }, {
          model: Image,
        }]
      }, {
        model: User,
        attributes: ['id', 'nickname'],
      }, {
        model: Image,
      }, {
        model: Comment,
        attributes: ['id', 'content', 'createdAt'],
        include: [{
          model: User,
          attributes: ['id', 'nickname'],
        }]
      }, {
        model: User,
        as: 'Likers',
        attributes: ['id'],
        through: { attributes: [] }
      }]
    });

    res.status(201).json(retweetWithPrevPost);

  } catch (error) {
    console.log(error);
    next(error);
  }
});

// PATCH /post/1/like
// 게시글 좋아요
router.patch('/:postId/like', authenticated, async (req, res, next) => {
  try {
    const post = await Post.findOne({
      where: {id: req.params.postId}
    });

    if (!post) {
      return res.status(403).send('게시글이 존재하지 않습니다.');
    }

    await post.addLikers(req.user.id);
    res.status(200).json({PostId: post.id, UserId: req.user.id});

  } catch(error) {
    console.log(error);
    next(error);
  }
});

// DELETE /post/1/like
// 게시글 좋아요 취소
router.delete('/:postId/like', authenticated, async (req, res, next) => {
  try {
    const post = await Post.findOne({
      where: {id: req.params.postId}
    });

    if (!post) {
      return res.status(403).send('게시글이 존재하지 않습니다.');
    }

    await post.removeLikers(req.user.id);
    res.status(200).json({PostId: post.id, UserId: req.user.id});

  } catch(error) {
    console.log(error);
    next(error);
  }
});

// DELETE /post/1
// 게시글 삭제
router.delete('/:postId', authenticated, async (req, res, next) => {
  try {
    const post = await Post.findOne({
      where: {
        id: req.params.postId,
        UserId: req.user.id,
      },
    });

    if (!post) {
      return res.status(403).send('삭제 하실 권한이 없습니다.');
    }

    await Post.destroy({
      where: {
        id: post.id,
        UserId: req.user.id,
      }
    });
    res.status(200).json({PostId: post.id});

  } catch(error) {
    console.log(error);
    next(error);
  }
});
module.exports = router;