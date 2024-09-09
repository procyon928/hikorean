// routes/translate.js
const axios = require('axios');
require('dotenv').config();

// 구글 번역 API 호출 코드
const translateWithGoogle = async (text, targetLang) => {
  const apiKey = process.env.GOOGLE_API_KEY;
  const url = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`;

  try {
    const response = await axios.post(url, {
      q: text,
      target: targetLang,
      format: 'text'
    });
    return response.data.data.translations[0].translatedText;
  } catch (error) {
    console.error('Google Translate API 호출 오류:', error.response ? error.response.data : error.message);
    throw new Error('Google Translate API 호출 실패');
  }
};

// 마이크로소프트 번역 API 호출 코드
const translateWithMicrosoft = async (text, targetLang) => {
  const apiKey = process.env.MICROSOFT_API_KEY;
  const endpoint = 'https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&from=ko&textType=html';

  try {
    const response = await axios.post(`${endpoint}&to=${targetLang}`, [{
      Text: text,
    }], {
      headers: {
        'Ocp-Apim-Subscription-Key': apiKey,
        'Ocp-Apim-Subscription-Region': 'koreacentral',
        'Content-type': 'application/json'
      }
    });
    return response.data[0].translations[0].text;
  } catch (error) {
    console.error('Microsoft Translate API 호출 오류:', error.response ? error.response.data : error.message);
    throw new Error('Microsoft Translate API 호출 실패');
  }
};

module.exports = {
  translateWithGoogle,
  translateWithMicrosoft
};
