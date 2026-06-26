const DEFAULT_TRANSLATOR_ENDPOINT = 'https://api.cognitive.microsofttranslator.com';

module.exports = async function (context, req) {
  const translatorKey = process.env.TRANSLATOR_KEY;
  const translatorRegion = process.env.TRANSLATOR_REGION;
  const translatorEndpoint = process.env.TRANSLATOR_ENDPOINT || DEFAULT_TRANSLATOR_ENDPOINT;

  if (req.method === 'GET') {
    context.res = jsonResponse(200, {
      success: true,
      message: 'Translation API is running.',
      configuration: {
        translatorKeyConfigured: Boolean(translatorKey),
        translatorRegionConfigured: Boolean(translatorRegion),
        translatorEndpoint
      }
    });
    return;
  }

  if (req.method !== 'POST') {
    context.res = jsonResponse(405, {
      success: false,
      code: 'METHOD_NOT_ALLOWED',
      error: 'POST 요청만 지원합니다.'
    });
    return;
  }

  const { text, from, to } = req.body || {};

  if (!translatorKey) {
    context.res = jsonResponse(500, {
      success: false,
      code: 'MISSING_TRANSLATOR_KEY',
      error: 'Azure Translator 키가 설정되지 않았습니다. Static Web App의 Application settings에 TRANSLATOR_KEY를 추가하세요.'
    });
    return;
  }

  if (!text || typeof text !== 'string' || !text.trim()) {
    context.res = jsonResponse(400, {
      success: false,
      code: 'INVALID_TEXT',
      error: '번역할 텍스트를 입력하세요.'
    });
    return;
  }

  if (!to || typeof to !== 'string') {
    context.res = jsonResponse(400, {
      success: false,
      code: 'INVALID_TARGET_LANGUAGE',
      error: '대상 언어가 올바르지 않습니다.'
    });
    return;
  }

  const query = new URLSearchParams({
    'api-version': '3.0',
    to
  });

  if (from && from !== 'auto') {
    query.set('from', from);
  }

  try {
    const headers = {
      'Ocp-Apim-Subscription-Key': translatorKey,
      'Content-Type': 'application/json'
    };

    if (translatorRegion) {
      headers['Ocp-Apim-Subscription-Region'] = translatorRegion;
    }

    const response = await fetch(`${translatorEndpoint}/translate?${query}`, {
      method: 'POST',
      headers,
      body: JSON.stringify([{ text }])
    });

    const bodyText = await response.text();
    let body;

    try {
      body = bodyText ? JSON.parse(bodyText) : null;
    } catch {
      body = null;
    }

    if (!response.ok) {
      const apiMessage = body?.error?.message || response.statusText || 'Azure Translator API 오류';
      context.log.error('Translator API error', response.status, apiMessage);
      context.res = jsonResponse(response.status, {
        success: false,
        code: body?.error?.code || 'TRANSLATOR_API_ERROR',
        error: apiMessage
      });
      return;
    }

    const translatedText = body?.[0]?.translations?.[0]?.text;

    if (!translatedText) {
      context.log.error('Unexpected Translator API response', body);
      context.res = jsonResponse(502, {
        success: false,
        code: 'INVALID_TRANSLATOR_RESPONSE',
        error: '번역 결과를 읽을 수 없습니다.'
      });
      return;
    }

    context.res = jsonResponse(200, {
      success: true,
      translatedText,
      detectedLanguage: body?.[0]?.detectedLanguage?.language || from || 'auto'
    });
  } catch (error) {
    context.log.error('Translator API request failed', error);
    context.res = jsonResponse(502, {
      success: false,
      code: 'TRANSLATOR_REQUEST_FAILED',
      error: 'Azure Translator API 호출에 실패했습니다.'
    });
  }
};

function jsonResponse(status, body) {
  return {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8'
    },
    body
  };
}
