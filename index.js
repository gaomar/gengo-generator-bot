const Jimp = require("jimp");
const AWS = require('aws-sdk');
const s3 = new AWS.S3();

// Postデータ
const paramsToPut = (name, body) => {
  return {
    Bucket: process.env.BUCKET_NAME,
    Key: name,
    Body: body,
    ContentType: 'image/png',
    CacheControl: "no-cache, no-store",
    ACL: 'public-read'
  };
};

// 日付フォーマット
const dateToStr12HPad0 = (date, format) => {
  if (!format) {
      format = 'YYYY/MM/DD hh:mm:dd';
  }
  var hours = date.getHours();
  hours = hours % 12;
  hours = (hours != 0) ? hours : 12; // 0時は12時と表示する
  format = format.replace(/YYYY/g, date.getFullYear());
  format = format.replace(/MM/g, ('0' + (date.getMonth() + 1)).slice(-2));
  format = format.replace(/DD/g, ('0' + date.getDate()).slice(-2));
  format = format.replace(/hh/g, ('0' + hours).slice(-2));
  format = format.replace(/mm/g, ('0' + date.getMinutes()).slice(-2));
  format = format.replace(/ss/g, ('0' + date.getSeconds()).slice(-2));
  format = format.replace(/dd/g, ('0' + date.getMilliseconds()).slice(-3));
  return format;
};

exports.handler = async (event) => {
  const myList = '万中久乾亀亨享仁保元勝化吉同和喜嘉国大天字安宝寛寿平康延建弘徳応感慶成承授政文斉昌明昭景暦正武永治泰白祚神祥禄禎福老至興衡観護貞銅長雉雲霊養';

  // 生成する文字列の長さ
  const l = 2;
  var cl = myList.length;
  var r = "";
  for(var i=0; i<l; i++){
    r += myList[Math.floor(Math.random()*cl)];
  }

  const text1 = r.substr(0, 1);
  const text2 = r.substr(1, 1);
  const message = `新元号は「${text1}${text2}」であります。`;  

  const font = await Jimp.loadFont('./File/gengo.fnt');
  const timezoneoffset = -9;     // UTC-表示したいタイムゾーン(単位:hour)。JSTなら-9
  const today = new Date(Date.now() - (timezoneoffset * 60 - new Date().getTimezoneOffset()) * 60000);
  const fileName = dateToStr12HPad0(today, 'YYYYMMDDhhmmssdd') + '.png';

  return new Promise(function(resolve){
    Jimp.read("./File/gengou_happyou_blank.png", function (err, image) {
      if (err) throw err;
      image.print(font, 94, 180, text1);
      image.print(font, 94, 245, text2).getBase64(Jimp.MIME_PNG, function (err, src) {
        if (err) throw err;
        // Buffer
        const fileData = src.replace(/^data:\w+\/\w+;base64,/, '');
        const decodedFile = Buffer.from(fileData, 'base64');
        s3.putObject(paramsToPut(fileName, decodedFile), (data) => {
          const url = `https://s3-ap-northeast-1.amazonaws.com/${process.env.BUCKET_NAME}/${fileName}`;
          const responseJson = JSON.stringify({
            "fulfillmentText": "",
            "followupEventInput": {
              "name": "FINISH",
              "languageCode": "ja-JP",
              "parameters": {
                "myURL": url.replace(/^https:\/\//, ''),
                "message": message
              }
            }
          });
          var response = {
            statusCode: 200,
            headers: { "Content-type": "application/json; charset=UTF-8" },
            body: responseJson
          };
          resolve(response);
        });
      });
    });
  });
};
