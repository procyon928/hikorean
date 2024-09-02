const express = require('express');
const router = express.Router();
const Survey = require('../models/Survey');
const Response = require('../models/Response');
const { isAdmin, ensureAuthenticated } = require('../middleware/auth');

// 설문조사 생성 페이지
router.get('/new', isAdmin, (req, res) => {
  res.render('surveys/new'); // 새로운 설문조사 생성 폼을 렌더링
});

// 설문조사 생성 페이지
router.post('/create', ensureAuthenticated, isAdmin, async (req, res) => {
  console.log(req.session.user); // req.session.user를 확인
  const { title, questions, questionType, options } = req.body;

  // console.log 추가
  console.log("Title: ", title);
  console.log("Questions: ", questions);
  console.log("Question Types: ", questionType);
  console.log("Options: ", options);

  // 설문조사 객체 생성
  const survey = new Survey({
    title,
    questions: questions.map((question, index) => ({
        question,
        options: questionType[index] === 'single-choice' || questionType[index] === 'multiple-choice' ? (options[index] || []).filter(opt => opt) : []
    })),
    createdBy: req.session.user._id
  });

  try {
      await survey.save();
      res.redirect('/surveys/list'); // 목록 페이지로 리다이렉트
  } catch (err) {
      console.error(err);
      res.status(500).send('설문조사 생성 중 오류가 발생했습니다.');
  }
});

// 설문조사 수정 페이지
router.get('/edit/:id', isAdmin, async (req, res) => {
    const survey = await Survey.findById(req.params.id);
    res.render('surveys/edit', { survey });
});

// 설문조사 삭제 처리
router.post('/delete/:id', isAdmin, async (req, res) => {
  const surveyId = req.params.id;

  try {
      await Survey.findByIdAndDelete(surveyId); // 설문조사 삭제
      res.redirect('/surveys/list'); // 목록 페이지로 리다이렉트
  } catch (err) {
      console.error(err);
      res.status(500).send('설문조사 삭제 중 오류가 발생했습니다.');
  }
});

// 설문조사 목록 페이지
router.get('/list', isAdmin, async (req, res) => {
    const surveys = await Survey.find();
    res.render('surveys/list', { surveys });
});

// 설문조사 결과 페이지
router.get('/result/:id', isAdmin, async (req, res) => {
    const survey = await Survey.findById(req.params.id);
    // 결과 처리 로직을 추가해야 함
    res.render('surveys/result', { survey });
});

// 사용자 응답 페이지
router.get('/response/:id', async (req, res) => { // ensureAuthenticated 제거
  const survey = await Survey.findById(req.params.id);
  res.render('surveys/response', { survey });
});

// 사용자 응답 처리
router.post('/response/:id', async (req, res) => {
  const surveyId = req.params.id;
  const responses = req.body.response; // 사용자 응답 가져오기

  // 응답 데이터 포맷팅
  const formattedResponses = Object.keys(responses).map((questionId) => ({
      questionId,
      answer: responses[questionId]
  }));

  // 응답 객체 생성
  const response = new Response({
      surveyId,
      // userId를 비회원일 경우 생략
      answers: formattedResponses
  });

  try {
      await response.save(); // 응답 데이터베이스에 저장
      console.log(`설문 ID: ${surveyId}, 사용자 응답: ${JSON.stringify(formattedResponses)}`);
      // 결과 페이지로 응답과 함께 리다이렉트
      const survey = await Survey.findById(surveyId);
      res.render('surveys/result', { survey, formattedResponses });
  } catch (err) {
      console.error(err);
      res.status(500).send('응답 저장 중 오류가 발생했습니다.');
  }
});

// 설문조사 목록 페이지 (사용자용)
router.get('/', async (req, res) => {
    const surveys = await Survey.find();
    res.render('surveys/survey', { surveys });
});

// 사용자 응답 내역 페이지
router.get('/myResponses', ensureAuthenticated, (req, res) => {
    // 사용자 응답 내역 처리 로직을 추가해야 함
    res.render('surveys/myResponses');
});

module.exports = router;
