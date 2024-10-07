const express = require('express');
const router = express.Router();
const Notice = require('../models/Notice');
const TemporaryTranslation = require('../models/TemporaryTranslation');
const { isAdmin } = require('../middleware/auth');
const { translateWithGoogle, translateWithMicrosoft, translateWithDeepl, languageCodes } = require('./translate');
const { Parser, DomHandler } = require('htmlparser2');
const { applyStyles } = require('./notice');

const app = express();
app.use(express.json());

let lines = []; // 외부 변수로 초기화

// 안내문 번역 페이지 이동
router.get('/notices/translate/:id', isAdmin, async (req, res) => {
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
  
  // googleTranslations와 microsoftTranslations, deeplTranslations 초기화
  const googleTranslations = [];
  const microsoftTranslations = [];
  const deeplTranslations = [];
  const targetLang = req.query.lang || ''; // 선택된 언어를 쿼리에서 가져오기
  const finalTranslations = notice.translations[targetLang]?.final || [];

  // styledContent 생성
  const styledContent = applyStyles(notice.translations[targetLang]?.translatedContent || notice.content);

  res.render('notices/translator', { notice, lines, googleTranslations, microsoftTranslations, deeplTranslations, finalTranslations, targetLang: '', styledContent });
});


// 안내문 번역 처리 페이지
router.post('/notices/translate/:id', isAdmin, async (req, res) => {
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
  let deeplTranslations = [];
  let finalTranslations = notice.translations[targetLang]?.final || [];
  let finalTranslationString = '';

  // styledContent 생성
  const styledContent = applyStyles(notice.translations[targetLang]?.translatedContent || notice.content);

  if (!needTranslation) {
      // 번역이 필요하지 않으면 DB 값 사용
      googleTranslations = notice.translations[targetLang].google || [];
      microsoftTranslations = notice.translations[targetLang].microsoft || [];
      deeplTranslations = notice.translations[targetLang].deepl || [];
      return res.render('notices/translator', { notice, targetLang, lines, googleTranslations, microsoftTranslations, deeplTranslations, finalTranslations, finalTranslationString, styledContent });
  }

  const googleLang = languageCodes[targetLang].google;
  const microsoftLang = languageCodes[targetLang].microsoft;
  const deeplLang = languageCodes[targetLang].deepl;

  try {
      // 모든 문장을 하나의 문자열로 결합
      const combinedText = lines.join('\n'); // 줄바꿈으로 연결

      // 결합된 문장 번역 수행
      combined_googleTranslations = await translateWithGoogle(combinedText, googleLang);
      combined_microsoftTranslations = await translateWithMicrosoft(combinedText, microsoftLang);
      console.log('결합된 구글 문장: ', combined_googleTranslations);

      // googleTranslations = await Promise.all(lines.map(line => translateWithGoogle(line, googleLang)));
      // microsoftTranslations = await Promise.all(lines.map(line => translateWithMicrosoft(line, microsoftLang)));

      // DeepL 번역 수행 (베트남어 제외)
      if (targetLang !== 'vi') {
          combined_deeplTranslations = await translateWithDeepl(combinedText, deeplLang);
      } else {
          combined_deeplTranslations = new Array(lines.length).fill('');  // 베트남어는 빈 문자열로 설정
      }

      // 각 번역 결과를 원래의 lines 배열에 맞게 다시 분리
      const googleTranslations = combined_googleTranslations.split('\n');
      const microsoftTranslations = combined_microsoftTranslations.split('\n');
      
      // deeplTranslations가 빈 문자열 배열일 경우 처리
      const deeplTranslations = targetLang === 'vi' ? new Array(lines.length).fill('') : combined_deeplTranslations.split('\n');

      // 해당 언어에 대한 번역 저장
      notice.translations[targetLang] = {
          google: googleTranslations,
          microsoft: microsoftTranslations,
          deepl: deeplTranslations,
          final: finalTranslations,
          translatedContent: finalTranslationString,
          translatedAt: new Date()
      };

      await notice.save();

      // 번역된 내용을 EJS로 전달
      res.render('notices/translator', { notice, targetLang, lines, googleTranslations, microsoftTranslations, deeplTranslations, finalTranslations, finalTranslationString, styledContent });
  } catch (error) {
      console.error('번역 오류:', error.message);
      res.status(500).send('번역 중 오류가 발생했습니다.');
  }
});

// HTML 파싱 및 텍스트 교체 함수
const parseAndReplaceText = (htmlContent, translations) => {
  const handler = new DomHandler();
  const parser = new Parser(handler);
  parser.write(htmlContent);
  parser.end();

  let translationIndex = 0;
  const replaceTextInNode = (node) => {
      if (node.type === 'text') {
          if (translationIndex < translations.length) {
              node.data = translations[translationIndex++];
          }
      } else if (node.children) {
          node.children.forEach(replaceTextInNode);
      }
  };

  handler.dom.forEach(replaceTextInNode);

  // 수정된 DOM을 다시 HTML 문자열로 변환
  return handler.dom.map(node => {
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
};

// 안내문 최종 번역 저장
router.post('/notices/translate/save/:id', isAdmin, async (req, res) => {
  const { id } = req.params;
  const { title, content, finalTranslations, lang } = req.body;
  const username = req.user.username;

  try {
      console.log('요청된 ID:', id);
      console.log('요청 본문:', req.body);

      const notice = await Notice.findById(id);
      
      if (!notice) {
          console.log('안내문을 찾을 수 없습니다.');
          return res.status(404).send('안내문을 찾을 수 없습니다.');
      }

      const finalSavedAt = notice.translations[lang]?.translatedAt;
      const noticeUpdatedAt = notice.updatedAt;

      if (finalSavedAt && noticeUpdatedAt > finalSavedAt) {
          return res.status(400).json({
              message: '번역 진행 중, 한국어 원문이 수정되었습니다. 수정된 한국어 원문을 확인하시기 바랍니다. 작성한 번역은 임시저장되었습니다.'
          });
      }

      // 최종 번역 문자열 생성
      const finalTranslationString = parseAndReplaceText(notice.content, finalTranslations);
      console.log('최종 번역 문자열:', finalTranslationString);

      // 조건 확인: 'sc' 언어와 'tc'의 translatedContent가 비어있을 때
      if (lang === 'sc' && !notice.translations.tc.translatedContent) {
          const tcTranslations = await Promise.all(finalTranslations.map(line => translateWithGoogle(line, 'zh-TW'))); // 번체로 변환
          const tcFinalTranslationString = parseAndReplaceText(notice.content, tcTranslations);

          // 'tc' 번체 DB 업데이트
          notice.translations.tc.translatedContent = tcFinalTranslationString;
      }

      // Notice 업데이트
      notice.title = title;
      notice.content = content;
      notice.translations[lang] = {
          google: notice.translations[lang].google,
          microsoft: notice.translations[lang].microsoft,
          deepl: notice.translations[lang].deepl,
          final: finalTranslations,
          translatedContent: finalTranslationString,
          translatedAt: notice.translations[lang]?.translatedAt,
          finalSavedAt: new Date(),
          finalSavedBy: username
      };

      const updatedNotice = await notice.save(); // save() 메소드 사용

      if (!updatedNotice) {
          console.log('안내문 업데이트에 실패했습니다.');
          return res.status(500).send('안내문 업데이트에 실패했습니다.');
      }

      // 임시 저장된 번역 내용 삭제
      await TemporaryTranslation.deleteMany({ noticeId: id, language: lang });

      console.log('업데이트된 안내문:', updatedNotice);
      res.json({ message: '저장이 완료되었습니다.' });
  } catch (error) {
      console.error('데이터베이스 업데이트 오류:', error);
      res.status(500).send('서버 오류가 발생했습니다.');
  }
});

// 임시 저장 API
router.post('/notices/temporary-save', isAdmin, async (req, res) => {
  const { noticeId, language, translations } = req.body;
  const userId = req.user ? req.user._id : null; // 현재 로그인한 사용자 ID

  if (!userId) {
    return res.status(400).json({ message: '로그인 상태가 아닙니다.' });
  }

  try {
    // 노티스 조회
    const notice = await Notice.findById(noticeId);
    if (!notice) {
      return res.status(404).json({ message: '안내문을 찾을 수 없습니다.' });
    }

    // 조건 체크
    const finalSavedAt = notice.translations[language]?.finalSavedAt;
    const noticeUpdatedAt = notice.updatedAt;

    if (!finalSavedAt || noticeUpdatedAt > finalSavedAt) {
      // 기존에 저장된 임시 번역이 있는지 확인
      let tempTranslation = await TemporaryTranslation.findOne({ userId, noticeId, language });

      if (tempTranslation) {
        // 기존 데이터 업데이트
        tempTranslation.translations = translations;
        await tempTranslation.save();
      } else {
        // 새로운 데이터 생성
        tempTranslation = new TemporaryTranslation({ userId, noticeId, language, translations });
        await tempTranslation.save();
      }

      return res.status(200).json({ message: '임시 저장되었습니다.' });
    } else {
      return res.status(400).json({ message: '임시 저장할 조건을 만족하지 않습니다.' });
    }
  } catch (error) {
    console.error('임시 저장 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});


// 임시 저장된 번역 내용 로드 API
router.get('/notices/temporary/:noticeId/:language', isAdmin, async (req, res) => {
  const { noticeId, language } = req.params;
  const userId = req.user._id; // 현재 로그인한 사용자 ID

  try {
    const tempTranslation = await TemporaryTranslation.findOne({ userId, noticeId, language });

    if (tempTranslation) {
      res.status(200).json({ translations: tempTranslation.translations });
    } else {
      res.status(404).json({ translations: [] }); // 임시 저장된 내용이 없을 경우 빈 배열 반환
    }
  } catch (error) {
    // console.error('임시 저장 로드 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

module.exports = router;
