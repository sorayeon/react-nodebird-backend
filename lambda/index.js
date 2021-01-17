const AWS = require('aws-sdk');
const sharp = require('sharp');

const s3 = new AWS.S3();

// handler 라는 이름은 aws에서 쓰임
// 트리거 s3에 이미지 업로드 할때 호출하는 lambda
exports.handler = async (event, context, callback) => {
  const Bucket = event.Records[0].s3.bucket.name; // react-nodebird-images
  const Key = decodeURIComponent(event.Records[0].s3.object.key); // original/123_abc.png
  console.log('Bucket', Bucket, 'Key', Key);

  const filename = Key.split('/')[Key.split('/').length - 1]; // 123_abc.png
  const ext = Key.split('.')[Key.split('.').length - 1].toLowerCase();
  const requiredFormat = ext === 'jpg' ? 'jpeg' : ext;
  console.log('filename', filename, 'ext', ext);

  try {
    const s3Object = await s3.getObject({Bucket, Key}).promise();
    console.log('original', s3Object.Body.length);
    const resizedImage = await sharp(s3Object.Body)
      .resize(400, 400, {
        fit: 'inside'
      })
      .toFormat(requiredFormat)
      .toBuffer();
    await s3.putObject({
      Bucket,
      Key: `thumb/${filename}`,
      Body: resizedImage
    }).promise();
    console.log('put', resizedImage.length);
    return callback(null, `thumb/${filename}`);
  } catch (error) {
    console.error(error);
    return callback(error);
  }

}