const DataTypes = require('sequelize');
const { Model } = DataTypes;

class Hashtag extends Model {
  static init(sequelize) {
    return super.init({
      // id가 기본적으로 만들어진다.
      name: {
        type: DataTypes.STRING(20),
        allowNull: false,
      },
    }, {
      modelName: 'Hashtag', // 모델 Hashtag
      tableName: 'hashtags', // 테이블 hashtags
      charset: 'utf8',
      collate: 'utf8_general_ci', // 한글, 이모티콘 저장에 필요한 설정
      sequelize,
    });
  };

  static associate(db) {
    db.Hashtag.belongsToMany(db.Post, {through: 'PostHashtag'}); // Hashtag N : Post N
  };
}

module.exports = Hashtag;
