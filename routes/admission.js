const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// JSON 데이터 로드
const jsonData = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/content.json'), 'utf8'));

// 메인 페이지 라우트
router.get('/', (req, res) => {
  const lang = req.session.lang || 'ko'; // 기본 언어를 한국어로 설정
  res.render('admission/nationality', { messages: jsonData.messages, lang });
});

// admissionguide1 페이지 라우트
router.get('/admissionguide1', (req, res) => {
  const lang = req.query.lang || 'ko'; // 쿼리에서 언어를 가져오고 기본값은 한국어
  res.render('admission/admissionguide1', { lang });
});

// admissionguide2 페이지 라우트
router.get('/admissionguide2', (req, res) => {
  const lang = req.query.lang || 'ko'; // 쿼리에서 언어를 가져오고 기본값은 한국어
  res.render('admission/admissionguide2', { lang });
});

module.exports = router;
