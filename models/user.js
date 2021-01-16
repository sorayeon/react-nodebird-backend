const DataTypes = require('sequelize');
const { Model } = DataTypes;

class User extends Model {
  static init(sequelize) {
    return super.init({ // MySQL 에는 users 테이블 생성(모델은 User)
      // id가 기본적으로 만들어진다.
      email: {
        type: DataTypes.STRING(30), // STRING, TEXT, BOOLEAN, INTEGER, FLOAT, DATETIME
        allowNull: false, // 필수
        unique: true, // 고유한 값
      },
      nickname: {
        type: DataTypes.STRING(30),
        allowNull: false, //필수
      },
      password: {
        type: DataTypes.STRING(100),
        allowNull: false, //필수
      },
    }, {
      modelName: 'User', // 모델 User
      tableName: 'users', // 테이블 users
      charset: 'utf8',
      collate: 'utf8_general_ci', // 한글 저장에 필요한 설정
      sequelize,
    });
  }
  static associate(db) {
    db.User.hasMany(db.Post); // User 1 : Post N
    db.User.hasMany(db.Comment); // User 1 : Comment N
    // 사용자와 게시글 사이의 좋아요 관계 (User N : Post N)
    // through 중간 테이블의 이름을 like로 만든다
    // as로 별칭 user.getLiked 처럼 좋아요 누를 게시글을 가져옵니다.
    db.User.belongsToMany(db.Post, {through: 'Like', as: 'Liked'});
    // through : 테이블 이름을 바꿔줌. 중간 테이블의 이름을 Follow로 만든다
    // as로 별칭 user.Followers 나를 팔로워 하는 사람
    // as로 별칭 user.Followings 내가 팔로잉 하는 사람
    // 같은 테이블의 N:N 관계에서는 foreignKey를 넣어줘야 함 (새로 만들어지는 테이블의 컬럼을 구분 지어줘야 함)
    db.User.belongsToMany(db.User, {through: 'Follow', as: 'Followers', foreignKey: 'FollowingId'})
    db.User.belongsToMany(db.User, {through: 'Follow', as: 'Followings', foreignKey: 'FollowerId'})
  }
}

module.exports = User;

