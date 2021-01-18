const AWS = require('aws-sdk');
const sharp = require('sharp');

const s3 = new AWS.S3();

// handler 라는 이름은 aws에서 쓰임
// 트리거 s3에 이미지 업로드 할때 호출하는 lambda
/*
압축해서 s3로 보내는 방법
lambda -> git pull -> npm i 로 설치 (리눅스 환경에서 설치하는게 좋다)
프로젝트 압축 : zip -r aws-upload.zip ./*

압축한 파일 S3로 전달
AWS CLI 다운로드 : curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
AWS CLI 압축해제 : unzip awscliv2.zip
AWS CLI INSTALL : sudo ./aws/install
AWS CONFIG : aws configure
 AWS Access Key ID [None]:
 AWS Secret Access Key [None]:
 Default region name [None]: ap-northeast-2
 Default output format [None]: json
S3로 카피 : aws s3 cp "aws-upload.zip" s3://react-nodebird-images

lambda 함수생성 : react-nodebird-images-resize -> 함수 코드 -> S3에서 파일 업로드
URL : https://react-nodebird-images.s3.ap-northeast-2.amazonaws.com/aws-upload.zip
런타임 : Node, 핸들러 : index.handler, 제한시간 30초, 메모리 256MB
트리거 추가 : S3
 버킷 : react-nodebird-images
 이벤트 유형 : 모든 객체 생성 이벤트
 접두사 : original/ 안넣어주면 thumb/ 안에 이미지가 생성 될 때도 함수가 실행되서 큰일남
 */

exports.handler = async (event, context, callback) => {
  const Bucket = event.Records[0].s3.bucket.name; // react-nodebird-images
  const Key = decodeURIComponent(event.Records[0].s3.object.key); // original/123_abc.png
  // lambda -> CloudWatch Logs
  console.log('Bucket', Bucket, 'Key', Key);
  // Bucket react-nodebird-images Key original/1/1610983560326_j_fafUd018svcr2pps9pu37pe_kei8y4.jpg

  const id = Key.split('/')[Key.split('/').length - 2]; // 1
  const filename = Key.split('/')[Key.split('/').length - 1]; // 123_abc.png
  const ext = Key.split('.')[Key.split('.').length - 1].toLowerCase(); // png
  const requiredFormat = ext === 'jpg' ? 'jpeg' : ext;
  console.log('filename', filename, 'ext', ext);
  // filename 1610983560326_j_fafUd018svcr2pps9pu37pe_kei8y4.jpg ext jpg

  try {
    const s3Object = await s3.getObject({Bucket, Key}).promise();
    console.log('original', s3Object.Body.length);
    // original 265710
    const resizedImage = await sharp(s3Object.Body)
      .resize(400, 400, {
        fit: 'inside'
      })
      .toFormat(requiredFormat)
      .toBuffer();
    await s3.putObject({
      Bucket,
      Key: `thumb/${id}/${filename}`,
      Body: resizedImage
    }).promise();
    console.log('put', resizedImage.length);
    // put 22419
    return callback(null, `thumb/${id}/${filename}`);
  } catch (error) {
    console.error(error);
    return callback(error);
  }

}