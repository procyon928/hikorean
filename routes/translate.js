// routes/translate.js
const axios = require('axios');
require('dotenv').config();
const deepl = require('deepl-node');

// languageCodes 객체 추가
const languageCodes = {
  ko: { google: 'ko', microsoft: 'ko', deepl: 'KO' },
  sc: { google: 'zh-CN', microsoft: 'zh-Hans', deepl: 'ZH-HANS' },
  tc: { google: 'zh-TW', microsoft: 'zh-Hant', deepl: 'ZH-HANT' },
  jp: { google: 'ja', microsoft: 'ja', deepl: 'JA' },
  en: { google: 'en', microsoft: 'en', deepl: 'EN-US' },
  vi: { google: 'vi', microsoft: 'vi' } // deepL은 베트남어 미지원
};

// 구글 지원 언어 목록 https://cloud.google.com/translate/docs/languages?hl=ko
// 마이크로소프트 지원 언어 목록 https://learn.microsoft.com/ko-kr/azure/ai-services/translator/language-support
// DeepL 지원 언어 목록 https://developers.deepl.com/docs/resources/supported-languages#source-languages

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

// DeepL 번역 API 호출 코드
const translateWithDeepl = async (text, targetLang) => {
  const authKey = process.env.DEEPL_API_KEY; // 환경 변수에서 API 키 가져오기
  const translator = new deepl.Translator(authKey);

  try {
    const result = await translator.translateText(text, null, targetLang, {
      formality: 'prefer_more' // 형식 매개변수 추가
    });
    return result.text; // 번역된 텍스트 반환
  } catch (error) {
    console.error('DeepL Translate API 호출 오류:', error.message);
    throw new Error('DeepL Translate API 호출 실패');
  }
};

module.exports = {
  translateWithGoogle,
  translateWithMicrosoft,
  translateWithDeepl,
  languageCodes
};