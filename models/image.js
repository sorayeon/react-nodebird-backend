const DataTypes = require('sequelize');
const { Model } = DataTypes;

class Image extends Model {
  static init(sequelize) {
    return super.init({
      // id가 기본적으로 만들어진다.
      src: {
        type: DataTypes.STRING(200),
        allowNull: false,
      },
      // PostId belongsTo 자동 생기는 컬럼
    }, {
      modelName: 'Image', // 모델 Image
      tableName: 'images', // 테이블 images
      charset: 'utf8',
      collate: 'utf8_general_ci', // 한글 저장에 필요한 설정
      sequelize,
    });
  }
  static associate(db) {
    db.Image.belongsTo(db.Post); // Image N : Post 1
  }
}

module.exports = Image;