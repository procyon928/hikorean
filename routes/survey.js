const express = require('express');
const Survey = require('../models/Survey');
const Response = require('../models/Response');
const { convertToKST } = require('../utils/dateUtils');
const { ensureAuthenticated, isAdmin } = require('../middleware/auth');

const router = express.Router();

// 설문조사 목록 페이지
router.get('/list', ensureAuthenticated, async (req, res) => {
    const surveys = await Survey.find().populate('createdBy', 'username');
    res.render('surveys/list', { surveys });
});

// 설문조사 생성 페이지
router.get('/new', isAdmin, (req, res) => {
    res.render('surveys/new');
});

// 설문조사 생성 처리
router.post('/', isAdmin, async (req, res) => {
  console.log(req.body); // 요청 본문 출력
  const { title, questions } = req.body;

  // 비어있는 필드 확인
  if (!questions || !Array.isArray(questions)) {
      console.error('Questions are missing or not an array');
      return res.status(400).send('Invalid questions format');
  }

  // 각 문항에 대해 설명과 필수 여부를 추가하여 저장
  const formattedQuestions = questions.map(question => ({
      questionText: question.questionText,
      questionDescription: question.questionDescription, // 문항 설명 추가
      questionType: question.questionType,
      inputType: question.inputType,
      options: question.options || [],
      minValue: question.minValue,
      maxValue: question.maxValue,
      isRequired: question.isRequired === 'true',
      allowOther: question.allowOther === 'true',
      rankLimit: question.rankLimit,
      prefixText: question.prefixText,
      suffixText: question.suffixText,
      reservation: {
          startDate: question.reservation ? question.reservation.startDate.split('T')[0] : null,
          endDate: question.reservation ? question.reservation.endDate.split('T')[0] : null,
          maxParticipants: question.reservation ? question.reservation.maxParticipants : null,
          exceptionDates: question.reservation && question.reservation.exceptionDates 
              ? question.reservation.exceptionDates.split(',').map(date => date.trim())
              : []  // 기본값은 빈 배열
      },
      time_reservation: {
          availableDates: question.time_reservation && question.time_reservation.availableDates 
          ? question.time_reservation.availableDates.split(',').map(date => date.trim())
              : [], // 기본값은 빈 배열
          startTime: question.time_reservation ? question.time_reservation.startTime : null,
          endTime: question.time_reservation ? question.time_reservation.endTime : null,
          interval: question.time_reservation ? question.time_reservation.interval : null,
          maxParticipants: question.time_reservation ? question.time_reservation.maxParticipants : null
      }
  }));

  const survey = new Survey({ title, questions: formattedQuestions, createdBy: req.session.user._id });
  await survey.save();
  res.redirect('/survey/list');
});

// 응답 처리
router.post('/:id/respond', async (req, res) => {
  const { answers } = req.body;
  const survey = await Survey.findById(req.params.id);

  // 응답 검증
  const formattedAnswers = []; // 빈 배열 생성

  for (let i = 0; i < survey.questions.length; i++) {
      const question = survey.questions[i];
      const answerObj = answers[i] || {}; // answers[i]가 없을 경우 빈 객체로 초기화

      const answer = answerObj.answer || ""; // 응답이 없으면 빈 문자열로 처리
      const questionId = answerObj.questionId || question._id; // questionId 초기화

      // 필수 문항 체크
      if (question.isRequired && (!answer || answer.trim() === "")) {
          return res.status(400).send(`문항 ${i + 1}은 필수입니다.`);
      }

      // 포맷팅된 답변 추가
      const otherAnswer = answerObj.otherAnswer || "";

      // 기존 문항 유형에 대한 처리
      formattedAnswers.push({
          questionId: questionId,
          answer: answer, // 항상 빈 값이거나 실제 응답이 들어가게 됩니다.
          otherAnswer: otherAnswer
      });

      // 추가적인 검증 로직
      if (question.questionType === 'short_answer') {
          const inputType = question.inputType; // inputType 사용

          if (inputType === 'integer') {
              const minValue = parseInt(answerObj.minValue, 10); // 최소값 가져오기
              const maxValue = parseInt(answerObj.maxValue, 10); // 최대값 가져오기

              // 정수 입력 유효성 검사
              const answerValue = parseInt(answer, 10);
              if (!Number.isInteger(answerValue) || answerValue < minValue || answerValue > maxValue) {
                  return res.status(400).send(`문항 ${i + 1}의 입력값은 ${minValue}와 ${maxValue} 사이의 정수여야 합니다.`);
              }
          } else if (inputType === 'letters') {
              // 영문자 입력 유효성 검사
              if (/[^a-zA-Z\s]/.test(answer)) {
                  return res.status(400).send(`문항 ${i + 1}의 입력값은 영문자만 가능합니다.`);
              }
          }
          // 'all'일 경우 검증을 생략합니다.
      }

      // 선호도 문항 처리
      else if (question.questionType === 'preference') {
          const answerObj = {};
          const selectedRanks = new Set(); // 중복 순위를 체크하기 위한 Set

          for (let optionIndex = 0; optionIndex < question.options.length; optionIndex++) {
              const rank = answerObj[`answer[${optionIndex}]`];
              if (rank) {
                  if (selectedRanks.has(rank)) {
                      return res.status(400).send(`순위 ${rank}는 이미 다른 선택지에서 선택되었습니다.`);
                  }
                  selectedRanks.add(rank);
              }
          }

          formattedAnswers.push({
              questionId: questionId,
              answer: answerObj // 모든 선택지에 대한 순위 정보를 저장
          });
      }
  }

  const response = new Response({
      surveyId: req.params.id,
      userId: req.session.user ? req.session.user._id : null, // 로그인한 경우 userId 설정
      answers: formattedAnswers // 포맷팅된 answers 사용
  });
  await response.save();
  
  // 설문조사 목록 페이지로 리디렉션
  res.redirect('/survey');
});

// 응답 수 카운트 API
router.get('/:id/countResponses', async (req, res) => {
  const { date } = req.query;

  // KST로 변환
  const kstDate = convertToKST(date);

  const count = await Response.countDocuments({
      surveyId: req.params.id,
      'answers.answer': kstDate // 선택된 날짜에 대한 응답 수
  });

  res.json({ count });
});

// 설문조사 수정 페이지
router.get('/:id/edit', isAdmin, async (req, res) => {
  const survey = await Survey.findById(req.params.id);
  res.render('surveys/edit', { survey });
});

// 설문조사 수정 처리
router.post('/:id', isAdmin, async (req, res) => {
  const { title, questions } = req.body;
  await Survey.findByIdAndUpdate(req.params.id, { title, questions });
  res.redirect('/survey/list');
});

// 설문조사 삭제 처리
router.post('/:id/delete', isAdmin, async (req, res) => {
  await Survey.findByIdAndDelete(req.params.id);
  res.redirect('/survey/list');
});

// 사용자 설문조사 목록 페이지
router.get('/', async (req, res) => {
  const surveys = await Survey.find().populate('createdBy', 'username');
  res.render('surveys/survey', { surveys }); // 사용자 목록을 렌더링
});

// 설문조사 응답 페이지
router.get('/:id/respond', ensureAuthenticated, async (req, res) => {
    const survey = await Survey.findById(req.params.id);
    res.render('surveys/respond', { survey });
});

// 설문조사 결과 보기 페이지 (관리자용)
router.get('/:id/results', isAdmin, async (req, res) => {
    const responses = await Response.find({ surveyId: req.params.id }).populate('userId', 'username');
    res.render('surveys/results', { responses });
});

module.exports = router;
