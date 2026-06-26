const https = require('https');

module.exports = async function (context, req) {
  try {
    const apiKey = process.env.TRANSLATOR_KEY;

    if (!apiKey) {
      return {
        status: 400,
        body: JSON.stringify({ success: false, error: 'API 키 없음' })
      };
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { text, from, to } = body;

    if (!text || !to) {
      return {
        status: 400,
        body: JSON.stringify({ success: false, error: '필수 파라미터 없음' })
      };
    }

    const result = await translate(text, from || 'auto', to, apiKey);

    return {
      status: 200,
      body: JSON.stringify({
        success: true,
        translatedText: result
      })
    };

  } catch (error) {
    return {
      status: 500,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};

function translate(text, fromLang, toLang, apiKey) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify([{ Text: text }]);

    const options = {
      hostname: 'api.cognitive.microsofttranslator.com',
      path: `/translate?api-version=3.0&from=${fromLang}&to=${toLang}`,
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': apiKey,
        'Ocp-Apim-Region': 'eastasia',
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';

      res.on('data', chunk => responseData += chunk);

      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`Status ${res.statusCode}: ${responseData}`));
          return;
        }

        try {
          const parsed = JSON.parse(responseData);
          resolve(parsed[0].translations[0].text);
        } catch (e) {
          reject(new Error(`Parse error: ${e.message}`));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}
