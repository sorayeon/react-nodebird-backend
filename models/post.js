const DataTypes = require('sequelize');
const { Model } = DataTypes;

class Post extends Model {

  static init(sequelize) {
    return super.init({
      // id가 기본적으로 만들어진다.
      content: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      // UserId: belongsTo 컬럼이 자동으로 생성
      // RetweetId : PostId로 생기면 안되므로 as로 변경
    }, {
      modelName: 'Post', // 모델 Post
      tableName: 'posts', // 테이블 posts
      charset: 'utf8mb4',
      collate: 'utf8mb4_general_ci', // 한글, 이모티콘 저장에 필요한 설정
      sequelize,
    });
  }
  static associate(db) {
    // 관계 메서드(단수) -> post.addUser, post.getUser, post.setUser, post.removeUser
    db.Post.belongsTo(db.User); // Post N : User 1
    // N:N 관계 through -> posthashtag 라는 테이블
    // PostId, HashtagId 컬럼이 자동으로 생성된다
    // 관계 메서드(복수) -> post.addHashtags
    db.Post.belongsToMany(db.Hashtag, {through: 'PostHashtag'}); // Post N : Hashtag N
    // 관계 메서드(복수) -> post.addComments
    db.Post.hasMany(db.Comment); // Post 1 : Comment N
    // 관계 메서드(복수) -> post.addImages, post.getImages
    db.Post.hasMany(db.Image); // Post 1 : Image N
    // 게시글과 사용자의 좋아요 관계 (Post N : User N)
    // through 로 중간 테이블의 이름을 like 로 만든다
    // as에 따라서 post.getLikers 처럼 게시글 좋아요 누는 사람을 가져옵니다.
    // 관계 메서드(복수) -> post.addLikers (게시글 좋아요), post.removeLikers (게시글 좋아요 취소)
    db.Post.belongsToMany(db.User, {through: 'Like', as: 'Likers'});
    // 관계 메서드(단수) -> post.addRetweet
    db.Post.belongsTo(db.Post, {as: 'Retweet'}); // 리트윗기능 게시글 1 : 게시글 N
  }
}

module.exports = Post;