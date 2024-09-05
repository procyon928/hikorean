const express = require('express');
const router = express.Router();
const Notice = require('../models/Notice');
const { isAdmin } = require('../middleware/auth');
const axios = require('axios');
const { Parser, DomHandler } = require('htmlparser2');
require('dotenv').config();

const app = express();
app.use(express.json());

const languageCodes = {
  en: { google: 'en', microsoft: 'en' },
  jp: { google: 'ja', microsoft: 'ja' },
  tc: { google: 'zh-TW', microsoft: 'zh-Hant' },
  sc: { google: 'zh-CN', microsoft: 'zh-Hans' },
  vi: { google: 'vi', microsoft: 'vi' }
};

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

// 안내문 수정 처리
router.post('/notices/edit/:id', isAdmin, async (req, res) => {
  const { id } = req.params;
  const { title, content } = req.body;

  try {
      const updatedNotice = await Notice.findByIdAndUpdate(id, {
          title,
          content,
          updatedAt: new Date()
      }, { new: true });

      if (!updatedNotice) {
          return res.status(404).send('안내문을 찾을 수 없습니다.');
      }

      res.redirect('/notices');
  } catch (error) {
      console.error('안내문 수정 중 오류:', error);
      res.status(500).send('서버 오류가 발생했습니다.');
  }
});

// 안내문 삭제
router.post('/notices/delete/:id', isAdmin, async (req, res) => {
  const { id } = req.params;
  await Notice.findByIdAndDelete(id);
  res.redirect('/notices');
});

// 스타일 적용 함수 (서버 측)
function applyStyles(text) {
  // Bold 처리
  text = text.replace(/\*(.*?)\*/g, '<strong>$1</strong>');
  // Underline 처리
  text = text.replace(/_(.*?)_/g, '<u>$1</u>');
  // Color 처리
  text = text.replace(/\`(.*?)\`/g, '<span style="color: #FF1744;">$1</span>');
  // Background 처리
  text = text.replace(/\[(.*?)\]/g, '<span style="background-color: #FBF595;">&nbsp;$1&nbsp;</span>'); // FFB300
  return text;
}

// 안내문 개별 내용
router.get('/notices/:id', async (req, res) => {
  const { id } = req.params;
  const { lang } = req.query;

  const notice = await Notice.findById(id);

  if (!notice) {
      return res.status(404).send('안내문을 찾을 수 없습니다.');
  }

  const translations = notice.translations[lang] || notice.content; // 기본값은 원문
  const styledContent = applyStyles(translations.final || translations); // 스타일 적용
  
  res.render('notices/content', { notice, styledContent, lang });
});

let lines = []; // 외부 변수로 초기화

// 안내문 번역 페이지 이동
router.get('/notices/translate/:id', async (req, res) => {
  const { id } = req.params;

  const notice = await Notice.findById(id);
  if (!notice) {
      return res.status(404).send('안내문을 찾을 수 없습니다.');
  }

  // lines 배열 초기화
  lines = [];

  // 텍스트만 추출하고 줄별로 분리
  const parser = new Parser({
    ontext: function(text) {
      const trimmedText = text.trim();
      if (trimmedText) {
        lines.push(trimmedText); // 외부 변수에 추가
      }
    },
    onend: function() {
      console.log('추출 후 줄들:', lines); // 여기서 lines를 사용
    }
  });

  console.log('추출 전 줄들:', lines);
  parser.write(notice.content);
  parser.end();

  // 변환된 줄들을 사용
  console.log('추출된 줄들:', lines);
  
  // googleTranslations와 microsoftTranslations 초기화
  const googleTranslations = [];
  const microsoftTranslations = [];
  const targetLang = req.query.lang || ''; // 선택된 언어를 쿼리에서 가져오기
  const finalTranslations = notice.translations[targetLang]?.final || [];

  res.render('notices/translator', { notice, lines, googleTranslations, microsoftTranslations, finalTranslations, targetLang: '' });
});


// 안내문 번역 처리 페이지
router.post('/notices/translate/:id', async (req, res) => {
  const { id } = req.params;
  const { targetLang } = req.body;
  // const lines = req.body.lines || [];
  console.log('전달된 lines:', lines);

  const notice = await Notice.findById(id);
  if (!notice) {
      return res.status(404).send('안내문을 찾을 수 없습니다.');
  }

  // 번역이 필요한지 판단
  const needTranslation = !notice.translations[targetLang] || !notice.translations[targetLang].translatedAt ||
                          notice.updatedAt > notice.translations[targetLang].translatedAt;

  let googleTranslations = [];
  let microsoftTranslations = [];
  let finalTranslations = notice.translations[targetLang]?.final || [];
  let finalTranslationString = '';


  if (!needTranslation) {
      // 번역이 필요하지 않으면 DB 값 사용
      googleTranslations = notice.translations[targetLang].google || [];
      microsoftTranslations = notice.translations[targetLang].microsoft || [];
      return res.render('notices/translator', { notice, targetLang, lines, googleTranslations, microsoftTranslations, finalTranslations, finalTranslationString });
  }

  const googleLang = languageCodes[targetLang].google;
  const microsoftLang = languageCodes[targetLang].microsoft;

  try {
      // 각 줄에 대한 번역 수행
      googleTranslations = await Promise.all(lines.map(line => translateWithGoogle(line, googleLang)));
      microsoftTranslations = await Promise.all(lines.map(line => translateWithMicrosoft(line, microsoftLang)));

      // 해당 언어에 대한 번역 저장
      notice.translations[targetLang] = {
          google: googleTranslations,
          microsoft: microsoftTranslations,
          final: finalTranslations,
          translatedContent: finalTranslationString,
          translatedAt: new Date()
      };

      await notice.save();

      // 번역된 내용을 EJS로 전달
      res.render('notices/translator', { notice, targetLang, lines, googleTranslations, microsoftTranslations, finalTranslations, finalTranslationString });
  } catch (error) {
      console.error('번역 오류:', error.message);
      res.status(500).send('번역 중 오류가 발생했습니다.');
  }
});

// 안내문 최종 번역 저장
router.post('/notices/translate/save/:id', isAdmin, async (req, res) => {
  const { id } = req.params;
  const { title, content, finalTranslations, lang } = req.body;
  

  try {
      console.log('요청된 ID:', id);
      console.log('요청 본문:', req.body);

      const notice = await Notice.findById(id);
      
      if (!notice) {
          console.log('안내문을 찾을 수 없습니다.');
          return res.status(404).send('안내문을 찾을 수 없습니다.');
      }

      // HTML 파싱
      const handler = new DomHandler();
      const parser = new Parser(handler);
      parser.write(notice.content);
      parser.end();
      console.log('파싱된 DOM:', handler.dom);

      // 각 노드의 텍스트를 최종 번역으로 교체
      let translationIndex = 0;
      const replaceTextInNode = (node) => {
          if (node.type === 'text') {
              if (translationIndex < finalTranslations.length) {
                  node.data = finalTranslations[translationIndex++];
              }
          } else if (node.children) {
              node.children.forEach(replaceTextInNode);
          }
      };

      handler.dom.forEach(replaceTextInNode);

      // 수정된 DOM을 다시 HTML 문자열로 변환
      const finalTranslationString = handler.dom.map(node => {
        if (node.type === 'text') {
            return node.data;
        } else if (node.type === 'tag') {
            const openingTag = `<${node.name}${Object.entries(node.attribs).map(([key, value]) => ` ${key}="${value}"`).join('')}>`;
            const closingTag = `</${node.name}>`;
            const innerHTML = node.children.map(child => {
                if (child.type === 'text') {
                    return child.data;
                } else if (child.type === 'tag') {
                    return `<${child.name}${Object.entries(child.attribs).map(([key, value]) => ` ${key}="${value}"`).join('')}>${child.children.map(grandChild => grandChild.data).join('')}</${child.name}>`;
                }
                return '';
            }).join('');
            return `${openingTag}${innerHTML}${closingTag}`;
        }
        return '';
    }).join('');
    

      console.log('최종 번역 문자열:', finalTranslationString);

      // Notice 업데이트
      notice.title = title;
      notice.content = content;
      notice.translations[lang] = {
          google: notice.translations[lang].google,
          microsoft: notice.translations[lang].microsoft,
          final: finalTranslations,
          translatedContent : finalTranslationString,
          finalSavedAt: new Date()
      };

      const updatedNotice = await notice.save(); // save() 메소드 사용

      if (!updatedNotice) {
          console.log('안내문 업데이트에 실패했습니다.');
          return res.status(500).send('안내문 업데이트에 실패했습니다.');
      }

      console.log('업데이트된 안내문:', updatedNotice);
      res.json({ message: '저장이 완료되었습니다.' });
  } catch (error) {
      console.error('데이터베이스 업데이트 오류:', error);
      res.status(500).send('서버 오류가 발생했습니다.');
  }
});


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

module.exports = router;
