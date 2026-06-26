module.exports = async function (context, req) {
  try {
    const apiKey = process.env.AZURE_TRANSLATOR_API_KEY;
    const region = process.env.AZURE_REGION || 'eastasia';

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

    const endpoint = 'https://api.cognitive.microsofttranslator.com/translate';
    const url = new URL(endpoint);
    url.searchParams.append('api-version', '3.0');
    url.searchParams.append('from', sourceCode);
    url.searchParams.append('to', targetCode);

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': apiKey,
        'Ocp-Apim-Region': region,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify([{ 'Text': text }])
    });

    if (!response.ok) {
      const errorText = await response.text();
      context.log('Azure API 오류:', response.status, errorText);
      context.res = {
        status: response.status,
        body: { success: false, error: `Azure API 오류: ${response.statusText}` }
      };
      return;
    }

    const result = await response.json();
    const translatedText = result[0].translations[0].text;

    context.res = {
      status: 200,
      body: {
        success: true,
        translatedText: translatedText,
        sourceLanguage: sourceCode
      }
    };

  } catch (error) {
    context.log('번역 오류:', error.message);
    context.res = {
      status: 500,
      body: {
        success: false,
        error: '번역 중 오류가 발생했습니다: ' + error.message
      }
    };
  }
};
