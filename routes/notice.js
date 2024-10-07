const express = require('express');
const router = express.Router();
const Notice = require('../models/Notice');
const { isAdmin } = require('../middleware/auth');
const { Parser } = require('htmlparser2');

const app = express();
app.use(express.json());

// 안내문 목록 조회
router.get('/admin/notices', isAdmin, async (req, res) => {
    const notices = await Notice.find().sort({ createdAt: -1 });
    res.render('notices/list', { notices });
});

// 안내문 작성 페이지
router.get('/notices/new', isAdmin, (req, res) => {
    res.render('notices/new');
});

// 안내문 작성
router.post('/notices', isAdmin, async (req, res) => {
    const { title, content, shortId } = req.body;
    const username = req.user.username;

    const notice = new Notice({ title, content, shortId, createdBy: username });
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

// HTML 파싱 함수
function parseContentToLines(content) {
  let lines = [];
  const parser = new Parser({
    ontext: function(text) {
      const trimmedText = text.trim();
      if (trimmedText) {
        lines.push(trimmedText);
      }
    },
  });
  parser.write(content);
  parser.end();
  return lines;
}

// 안내문 수정 처리
router.post('/notices/edit/:id', isAdmin, async (req, res) => {
  const { id } = req.params;
  const { title, content, shortId } = req.body;
  const username = req.user.username;

  try {
      const notice = await Notice.findById(id);
      if (!notice) {
          return res.status(404).send('안내문을 찾을 수 없습니다.');
      }
      
      const originalLines = parseContentToLines(notice.content);
      const newLines = parseContentToLines(content);
      console.log('원문:', originalLines);
      console.log('수정문:', newLines);

      // 번역 배열 위치 조정
      const updatedArrays = new Array(newLines.length).fill(''); // 최종 번역 배열 초기화

      newLines.forEach((newLine, i) => {
          const originalIndex = originalLines.indexOf(newLine); // newLine의 원문 위치 찾기

          if (originalIndex !== -1) {
              // 기존 번역을 사용
              updatedArrays[i] = originalLines[originalIndex]; // 원문에서 가져온 번역
          } else {
              // 새로운 문장이 추가된 경우 기본값 설정 (빈 문자열 또는 다른 기본값)
              updatedArrays[i] = ''; // 필요에 따라 수정
          }
      });

      // updatedArrays 배열 확인
      console.log(updatedArrays);

      // 모든 언어의 final 배열 업데이트
      Object.keys(notice.translations).forEach(lang => {
        const translations = notice.translations[lang];
        if (translations && translations.final) {
            // final 배열이 비어있다면 건너뛰기
            if (translations.final.length === 0) {
                return; // 빈 배열일 경우 업데이트 건너뛰기
            }

            const finalArray = new Array(newLines.length).fill(''); // newLines와 같은 길이의 배열 초기화
            newLines.forEach((newLine, i) => {
                const originalIndex = originalLines.indexOf(newLine);
                if (originalIndex !== -1) {
                    finalArray[i] = translations.final[originalIndex]; // 원문에서 가져온 번역
                }
            });

            translations.final = finalArray; // 빈 문자열 제거
        }
      });

      // 업데이트
      notice.title = title;
      notice.content = content;
      notice.shortId = shortId;
      notice.updatedAt = new Date();
      notice.updatedBy = username;

      const updatedNotice = await notice.save();

      if (!updatedNotice) {
          return res.status(500).send('안내문 업데이트에 실패했습니다.');
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
    text = text.replace(/\*(.*?)\*/g, '<strong>$1</strong>');
    text = text.replace(/_(.*?)_/g, '<u>$1</u>');
    text = text.replace(/\`(.*?)\`/g, '<span style="color: #FF1744;">$1</span>');
    text = text.replace(/\[(.*?)\]/g, '<span style="background-color: #FBF595;">&nbsp;$1&nbsp;</span>');
    return text;
}

// 각 언어별 배부 안내문(모든 사용자 접근 가능)
router.get('/notices/:shortId', async (req, res) => {
  const { shortId } = req.params;
  const { lang, idNum } = req.query;

  const notice = await Notice.findOne({ shortId });

  if (!notice) {
      return res.status(404).send('안내문을 찾을 수 없습니다.');
  }

  // idNum이 존재할 경우 해당 학번을 readIds 배열에 추가
    if (idNum) {
      if (!notice.readStudents.includes(idNum)) { // 중복 체크
          notice.readStudents.push(idNum);
          await notice.save(); // 변경 사항 저장
      }
  }

  // 특정 언어 번역이 없을 경우 기본 한국어 내용 사용
  let translatedContent;
  
  if (notice.translations[lang] && notice.translations[lang].translatedContent) {
      translatedContent = notice.translations[lang].translatedContent; // 번역된 내용이 있을 경우
  } else {
      translatedContent = notice.content; // 번역이 없을 경우 원문 사용
  }

  const styledContent = applyStyles(translatedContent); // 스타일 적용

  res.render('notices/content', { notice, styledContent, lang });
});

// 번역 게시글 목록 페이지
router.get('/notice', async (req, res) => {
  try {
      const notices = await Notice.find().sort({ createdAt: -1 });
      res.render('notices/notice', { notices, user: req.user, canWrite: true }); // canWrite은 필요에 따라 설정
  } catch (error) {
      console.error('번역 게시글 목록 조회 중 오류:', error);
      res.status(500).send('서버 오류가 발생했습니다.');
  }
});

// 안내서 페이지
router.get('/guidebook', async (req, res) => {
  res.render('notices/guidebook');
});

module.exports = router;
module.exports.applyStyles = applyStyles;