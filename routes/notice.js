const express = require('express');
const router = express.Router();
const Notice = require('../models/Notice');
const { isAdmin } = require('../middleware/auth');
const { Parser } = require('htmlparser2');
const cron = require('node-cron');

const app = express();
app.use(express.json());

async function generateRandomShortId() {
  const characters = 'abcdefghijklmnopqrstuvwxyz';
  let result;
  let exists = true;

  while (exists) {
      result = '';
      for (let i = 0; i < 3; i++) {
          result += characters.charAt(Math.floor(Math.random() * characters.length));
      }
      // 짧은 ID가 이미 존재하는지 확인
      const existingNotice = await Notice.findOne({ shortId: result });
      exists = !!existingNotice; // 존재하면 true, 존재하지 않으면 false
  }

  return result; // 고유한 짧은 ID 반환
}

// 매일 자정에 sticky 상태 확인
cron.schedule('0 0 * * *', async () => {
  const now = new Date();
  const oneWeek = 1 * 24 * 60 * 60 * 1000; // 날짜를 밀리초로 변환 (앞에 있는 숫자가 날짜, ex: 7은 1주일)

  // sticky 상태가 true인 모든 안내문을 찾음
  const notices = await Notice.find({ sticky: true });

  notices.forEach(async (notice) => {
      const effectiveDate = new Date(notice.updatedAt || notice.createdAt); // updatedAt가 없을 경우 createdAt 사용

      // sticky 상태 해제 조건
      if (now - effectiveDate > oneWeek) {
          // 1주일이 지난 경우 sticky 해제
          notice.sticky = false;
          await notice.save();
      }
  });
});

// 본문 위험한 기호 제거
function removeSpecialCharacters(content) {
  return content.replace(/[\$`{}]/g, ''); // $, `, {, }를 제거
}

// 짧은 ID 생성 요청 처리
router.post('/notices/generate-short-id', isAdmin, async (req, res) => {
  try {
      const shortId = await generateRandomShortId();
      res.json({ shortId }); // 생성된 짧은 ID 반환
  } catch (error) {
      console.error('짧은 ID 생성 중 오류 발생:', error);
      res.status(500).json({ message: '짧은 ID 생성 중 오류가 발생했습니다.' });
  }
});

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
  const { title, content, category, sticky } = req.body;
  const username = req.user.username;

  const sanitizedContent = removeSpecialCharacters(content);

  const notice = new Notice({
    title,
    content: sanitizedContent,
    shortId,
    createdBy: username,
    category,
    sticky: !!sticky // 체크박스가 체크된 경우 true, 그렇지 않으면 false
  });
  
  await notice.save();
  res.redirect('/admin/notices');
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
  const { title, content, shortId, category, sticky } = req.body;
  const username = req.user.username;

  try {
      const notice = await Notice.findById(id);
      if (!notice) {
          return res.status(404).send('안내문을 찾을 수 없습니다.');
      }

      const sanitizedContent = removeSpecialCharacters(content);

      // sticky 값을 체크박스에 따라 설정
      notice.sticky = sticky === 'on';
      
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
      notice.content = sanitizedContent;
      notice.shortId = shortId;
      notice.category = category;
      notice.updatedAt = new Date();
      notice.updatedBy = username;

      const updatedNotice = await notice.save();

      if (!updatedNotice) {
          return res.status(500).send('안내문 업데이트에 실패했습니다.');
      }

      res.redirect('/admin/notices');
  } catch (error) {
      console.error('안내문 수정 중 오류:', error);
      res.status(500).send('서버 오류가 발생했습니다.');
  }
});


// 안내문 삭제
router.post('/notices/delete/:id', isAdmin, async (req, res) => {
  const { id } = req.params;

  try {
      const notice = await Notice.findByIdAndDelete(id);
      if (!notice) {
          return res.status(404).send('안내문을 찾을 수 없습니다.');
      }

      res.redirect('/admin/notices');
  } catch (error) {
      console.error('안내문 삭제 중 오류 발생:', error.message);
      res.status(500).send('안내문 삭제 중 오류가 발생했습니다.');
  }
});


// 스타일 적용 함수 (서버 측)
function applyStyles(text) {
    text = text.replace(/\*\*(.*?)\*\*/g, '<span class="fw-bold">$1</span>');
    text = text.replace(/__(.*?)__/g, '<span class="text-decoration-underline">$1</span>');
    text = text.replace(/\#(.*?)\#/g, '<span class="text-danger">$1</span>'); //style="color: #FF1744;"
    text = text.replace(/\[(.*?)\]/g, '<span class="bg-warning-subtle">&nbsp;$1&nbsp;</span>'); //style="background-color: #FBF595;"

    // Bootstrap 클래스 추가
    text = text.replace(/<h1\s*/g, '<h1 class="fs-3 fw-bold py-3 mt-3 mb-2 border-bottom" '); // 제목
    text = text.replace(/<h2\s*/g, '<h2 class="fs-4 fw-bold py-2 mt-2 mb-1 border-bottom" '); // 부제목
    text = text.replace(/<h3\s*/g, '<h3 class="fs-5 my-2" '); // 강조
    text = text.replace(/<h4\s*/g, '<div class="d-flex align-items-start pt-2 my-2"><i class="bi bi-square-fill mt-1 pt-1 me-2" style="line-height: 1; font-size: 6px;"></i><h4 class="fs-6 m-0" '); // 굵은 p
    text = text.replace(/<\/h4>*/g, '</div></h4>'); // 굵은 p
    text = text.replace(/<h5\s*/g, '<h5 class="fs-6 small my-2" '); // 부연설명
    text = text.replace(/<p\s*/g, '<p class="my-3 lh-base" '); // 기본 여백 추가
    text = text.replace(/<ul\s*/g, '<ul class="my-2 ps-3 pt-1 ms-1" style="list-style-type:square;" ');
    text = text.replace(/<li\s*/g, '<li class="my-2 lh-base" ');
    text = text.replace(/<ol\s*/g, '<ol class="my-2 ps-4 pt-1 ms-2" ');
    text = text.replace(/<table class="table table-bordered">/g, '<div class="ps-3"><table class="table table-bordered table-hover table-responsive table-sm">');
    text = text.replace(/<\/table>/g, '</table></div>');
    text = text.replace(/<td>/g, '<td class="lh-base small">');
    text = text.replace(/margin-left: 41px/g, 'margin-left: 10px');


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
      const notices = await Notice.find({ category: '안내문' }).sort({ sticky: -1, createdAt: -1 }); // sticky 기준으로 정렬
      res.render('notices/notice', { notices, user: req.user, canWrite: true });
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