const DataTypes = require('sequelize');
const { Model } = DataTypes;

class Comment extends Model {
  static init(sequelize) {
    super.init({
      // id가 기본적으로 만들어진다.
      content: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      // UserId: {} // belongsTo의 경우 컬럼을 만들어준다.
      // PostId: {}
    }, {
      modelName: 'Comment', // 모델 Comment
      tableName: 'comments', // 테이블 comments
      charset: 'utf8mb4',
      collate: 'utf8mb4_general_ci', // 한글, 이모티콘 저장에 필요한 설정
      sequelize,
    });
  }

  static associate(db) {
    db.Comment.belongsTo(db.User);
    db.Comment.belongsTo(db.Post);
  }
}

module.exports = Comment;