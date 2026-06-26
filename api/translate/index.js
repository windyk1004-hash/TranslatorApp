const https = require('https');
const { URL } = require('url');

module.exports = async function (context, req) {
  // 테스트: 함수가 작동하는지 확인
  context.res = {
    status: 200,
    body: {
      success: true,
      translatedText: 'TEST: 함수가 정상 작동합니다.',
      apiKeyStatus: process.env.TRANSLATOR_KEY ? '설정됨' : '미설정'
    }
  };
  return;

  try {
    const apiKey = process.env.TRANSLATOR_KEY;
    const region = 'eastasia';

    if (!apiKey) {
      context.res = {
        status: 500,
        body: { success: false, error: 'API 키가 설정되지 않았습니다.' }
      };
      return;
    }

    const { text, from, to } = req.body;

    if (!text || !to) {
      context.res = {
        status: 400,
        body: { success: false, error: '텍스트와 목표 언어는 필수입니다.' }
      };
      return;
    }

    const languageMap = {
      'ko': 'ko',
      'en': 'en',
      'zh': 'zh-Hans',
      'auto': 'auto'
    };

    const sourceCode = languageMap[from] || from || 'auto';
    const targetCode = languageMap[to] || to;

    const translatedText = await translateWithAzure(text, sourceCode, targetCode, apiKey, region);

    context.res = {
      status: 200,
      body: {
        success: true,
        translatedText: translatedText
      }
    };

  } catch (error) {
    context.log('오류:', error.message);
    context.res = {
      status: 500,
      body: {
        success: false,
        error: error.message || '번역 중 오류가 발생했습니다.'
      }
    };
  }
};

function translateWithAzure(text, fromLang, toLang, apiKey, region) {
  return new Promise((resolve, reject) => {
    const url = new URL('https://api.cognitive.microsofttranslator.com/translate');
    url.searchParams.append('api-version', '3.0');
    url.searchParams.append('from', fromLang);
    url.searchParams.append('to', toLang);

    const postData = JSON.stringify([{ Text: text }]);

    const options = {
      hostname: 'api.cognitive.microsofttranslator.com',
      path: `/translate?api-version=3.0&from=${fromLang}&to=${toLang}`,
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': apiKey,
        'Ocp-Apim-Region': region,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`Azure API 오류: ${res.statusCode} - ${data}`));
          return;
        }

        try {
          const result = JSON.parse(data);
          const translatedText = result[0].translations[0].text;
          resolve(translatedText);
        } catch (e) {
          reject(new Error('응답 파싱 오류: ' + e.message));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error('API 호출 실패: ' + error.message));
    });

    req.write(postData);
    req.end();
  });
}
