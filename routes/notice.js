const express = require('express');
const router = express.Router();
const Notice = require('../models/Notice');
const { isAdmin } = require('../middleware/auth');
const axios = require('axios');
require('dotenv').config();

// 안내문 목록 조회
router.get('/notices', async (req, res) => {
    const notices = await Notice.find();
    res.render('notices/list', { notices });
});

// 안내문 작성 페이지
router.get('/notices/new', isAdmin, (req, res) => {
    res.render('notices/new');
});

// 안내문 작성
router.post('/notices', isAdmin, async (req, res) => {
    const { title, content } = req.body;
    const notice = new Notice({ title, content });
    await notice.save();
    res.redirect('/notices');
});

// 안내문 수정 페이지
router.get('/notices/edit/:id', isAdmin, async (req, res) => {
  const { id } = req.params;
  const notice = await Notice.findById(id);
  if (!notice) {
      return res.status(404).send('안내문을 찾을 수 없습니다.');
  }
  res.render('notices/edit', { notice });
});

// 안내문 삭제
router.post('/notices/delete/:id', isAdmin, async (req, res) => {
  const { id } = req.params;
  await Notice.findByIdAndDelete(id);
  res.redirect('/notices');
});

// 안내문 개별 내용
router.get('/notices/:id', async (req, res) => {
  const { id } = req.params;
  const { lang } = req.query;
  const notice = await Notice.findById(id);

  if (!notice) {
      return res.status(404).send('안내문을 찾을 수 없습니다.');
  }

  const translations = notice.translations[lang] || notice.content; // 기본값은 원문
  res.render('notices/view', { notice, translations });
});

// 안내문 번역 결과 저장
router.post('/notices/edit/:id', isAdmin, async (req, res) => {
  const { id } = req.params;
  const { title, content, finalTranslation } = req.body;

  try {
    const notice = await Notice.findById(id);
    
    if (!notice) {
      return res.status(404).send('안내문을 찾을 수 없습니다.');
    }

    await Notice.findByIdAndUpdate(id, { 
        title, 
        content,
        translations: {
            ...notice.translations,
            final: finalTranslation
        }
    });
    res.redirect('/notices');
  } catch (error) {
    console.error('데이터베이스 업데이트 오류:', error.message);
    res.status(500).send('서버 오류가 발생했습니다.');
  }
});

const languageCodes = {
  en: { google: 'en', microsoft: 'en' },
  jp: { google: 'ja', microsoft: 'ja' },
  tc: { google: 'zh-TW', microsoft: 'zh-Hant' },
  sc: { google: 'zh-CN', microsoft: 'zh-Hans' },
  vi: { google: 'vi', microsoft: 'vi' }
};

// 안내문 번역 페이지 GET 요청
router.get('/notices/translate/:id', async (req, res) => {
  const { id } = req.params;
  const notice = await Notice.findById(id);
  if (!notice) {
      return res.status(404).send('안내문을 찾을 수 없습니다.');
  }
  res.render('notices/translator', { notice });
});

// 안내문 번역 페이지
router.post('/notices/translate/:id', async (req, res) => {
  const { id } = req.params;
  const { targetLang } = req.body; // 선택한 목표어

  const notice = await Notice.findById(id);
  if (!notice) {
      return res.status(404).send('안내문을 찾을 수 없습니다.');
  }

  // 언어 코드 매핑을 사용하여 API 호출에 맞는 코드 선택
  const googleLang = languageCodes[targetLang].google;
  const microsoftLang = languageCodes[targetLang].microsoft;

  try {
      const googleTranslation = await translateWithGoogle(notice.content, googleLang);
      const microsoftTranslation = await translateWithMicrosoft(notice.content, microsoftLang);

      notice.translations = {
          google: googleTranslation,
          microsoft: microsoftTranslation
      };

      await notice.save();

      res.render('notices/translator', { notice });
  } catch (error) {
      console.error('번역 오류:', error.message);
      res.status(500).send('번역 중 오류가 발생했습니다.');
  }
});


// 구글 번역 API 호출 코드
const translateWithGoogle = async (text, targetLang) => {
  const apiKey = process.env.GOOGLE_API_KEY;
  const url = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`;

  // console.log('번역할 텍스트:', text);
  // console.log('대상 언어:', targetLang);
  // console.log('API URL:', url);

  try {
    const response = await axios.post(url, {
      q: text,
      target: targetLang,
      format: 'text'
    });
    // console.log('Google Translate 응답:', JSON.stringify(response.data, null, 2));
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

  // console.log('번역할 텍스트:', text);
  // console.log('대상 언어:', targetLang);
  // console.log('API URL:', `${endpoint}&to=${targetLang}`);

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
    // console.log('Microsoft Translate 응답:', JSON.stringify(response.data, null, 2));
    return response.data[0].translations[0].text;
  } catch (error) {
    console.error('Microsoft Translate API 호출 오류:', error.response ? error.response.data : error.message);
    throw new Error('Microsoft Translate API 호출 실패');
  }
};

module.exports = router;
