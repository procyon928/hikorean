const express = require('express');
const router = express.Router();
const axios = require('axios');
require('dotenv').config();
const deepl = require('deepl-node');
const { isAdmin } = require('../middleware/auth');

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
const translateWithGoogle = async (text, targetLang, sourceLang = 'ko') => {
  const apiKey = process.env.GOOGLE_API_KEY;
  const url = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`;

  try {
    const response = await axios.post(url, {
      q: text,
      target: targetLang,
      source: sourceLang, // 출발어를 설정
      format: 'text'
    });
    return response.data.data.translations[0].translatedText;
  } catch (error) {
    console.error('Google Translate API 호출 오류:', error.response ? error.response.data : error.message);
    throw new Error('Google Translate API 호출 실패');
  }
};

// 마이크로소프트 번역 API 호출 코드
const translateWithMicrosoft = async (text, targetLang, sourceLang = 'ko') => {
  const apiKey = process.env.MICROSOFT_API_KEY;
  const endpoint = `https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&from=${sourceLang}&textType=html`;

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

// 번역 요청 처리
router.get('/translate', isAdmin, async (req, res) => {
  const { text, targetLang } = req.query;

  try {
      const translation = await translateWithGoogle(text, languageCodes[targetLang].google);
      res.json({ translatedText: translation });
  } catch (error) {
      console.error('번역 오류:', error);
      res.status(500).json({ error: '번역 중 오류가 발생했습니다.' });
  }
});

// 번역 요청 처리
router.post('/', isAdmin, async (req, res) => {
  const { text, targetLang } = req.body;

  try {
      const googleTranslation = await translateWithGoogle(text, languageCodes[targetLang].google);
      const microsoftTranslation = await translateWithMicrosoft(text, languageCodes[targetLang].microsoft);
      const deeplTranslation = await translateWithDeepl(text, languageCodes[targetLang].deepl);

      res.json({
          google: googleTranslation,
          microsoft: microsoftTranslation,
          deepl: deeplTranslation
      });
  } catch (error) {
      console.error('번역 오류:', error);
      res.status(500).json({ error: '번역 중 오류가 발생했습니다.' });
  }
});

// 번역기 페이지 라우터
router.get('/admin/translator', isAdmin, (req, res) => {
  res.render('admin/translator'); // admin 폴더의 translator.ejs 파일 렌더링
});

module.exports = {
  router,
  translateWithGoogle,
  translateWithMicrosoft,
  translateWithDeepl,
  languageCodes
};