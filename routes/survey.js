const express = require('express');
const Survey = require('../models/Survey');
const Response = require('../models/Response');
const { ensureAuthenticated, isAdmin } = require('../middleware/auth');

const router = express.Router();

// 설문조사 목록 페이지
router.get('/admin/surveys', ensureAuthenticated, async (req, res) => {
    const surveys = await Survey.find().populate('createdBy', 'username').sort({ createdAt: -1 });
    res.render('surveys/list', { surveys });
});

// 설문조사 생성 페이지
router.get('/surveys/new', isAdmin, (req, res) => {
    res.render('surveys/new');
});

// 설문조사 생성 처리
router.post('/surveys', isAdmin, async (req, res) => {
  console.log(req.body); // 요청 본문 출력
  const { title, questions, startDate, endDate } = req.body;

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
      },
      infoText: question.infoText || null
  }));

  const survey = new Survey({
      title,
      questions: formattedQuestions,
      startDate: startDate ? new Date(startDate) : null, // 비어있으면 null로 설정
      endDate: endDate ? new Date(endDate) : null, // 비어있으면 null로 설정
      createdBy: req.user._id
  });
  await survey.save();
  res.redirect('/admin/surveys');
});

// 이메일 검증 처리 라우터
router.post('/surveys/verify-code', async (req, res) => {
  const { code } = req.body;

  // 세션에서 검증 코드 가져오기
  const sessionCode = req.session.verificationCode;

  // 입력한 코드와 세션 코드 비교
  if (!sessionCode || sessionCode !== code) {
      return res.status(400).json({ valid: false, message: '잘못된 검증 코드입니다.' });
  }

  // 검증 성공 처리
  req.session.verificationCode = undefined; // 코드 제거
  res.json({ valid: true, message: '이메일이 성공적으로 검증되었습니다.' });
});

// 응답 처리
router.post('/surveys/:id/respond', async (req, res) => {
  const { answers, startedAt, email } = req.body;
  console.log('Answers received:', answers);
  const survey = await Survey.findById(req.params.id);

  // 응답 검증
  const formattedAnswers = []; // 빈 배열 생성
  let answerIndex = 0; // 실제 답변 인덱스
  
  for (let i = 0; i < survey.questions.length; i++) {
      const question = survey.questions[i];
  
      // info 문항은 처리하지 않음
      if (question.questionType === 'info') {
          continue; // info 문항은 건너뜀
      }
  
      const answerObj = answers[answerIndex] || {}; // answers[answerIndex]가 없을 경우 빈 객체로 초기화
  
      const answer = answerObj.answer || ""; // 응답이 없으면 빈 문자열로 처리
      const questionId = answerObj.questionId || question._id; // questionId 초기화
  
      // 필수 문항 체크
      if (question.isRequired && (!answer || answer.trim() === "")) {
          return res.status(400).send(`문항 ${i + 1}은 필수입니다.`);
      }
  
      // 포맷팅된 답변 추가
      const otherAnswer = answerObj.otherAnswer || "";

      // 기존 문항 유형에 대한 처리
      if (question.questionType === 'preference') {
          const selectedRanks = answerObj.answer || []; // 선택된 순위 정보를 가져옴
          formattedAnswers.push({
              questionId: questionId,
              answer: selectedRanks // 모든 선택지에 대한 순위 정보를 저장
          });
      } else {
          formattedAnswers.push({
              questionId: questionId,
              answer: answer, // 항상 빈 값이거나 실제 응답이 들어가게 됩니다.
              otherAnswer: otherAnswer
          });
      }

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
      answerIndex++;
  }

  const response = new Response({
      surveyId: req.params.id,
      userId: req.user ? req.user._id : null, // 로그인한 경우 userId 설정
      answers: formattedAnswers, // 포맷팅된 answers 사용
      startedAt: new Date(startedAt),
      email
  });
  await response.save();
  
  // 설문조사 목록 페이지로 리디렉션
  res.redirect('/admin/surveys');
});

// 설문조사 응답 페이지
router.get('/surveys/:id/respond', async (req, res) => {
  const survey = await Survey.findById(req.params.id);
  const now = new Date();

  let message = null;

  // 현재 시간을 시작 시간으로 설정
  const startedAt = new Date();
  
  // startedAt 값을 콘솔에 출력
  console.log("Started At:", startedAt.toISOString()); // ISO 형식으로 출력

  // 시작 날짜와 종료 날짜 확인
  if (survey.startDate || survey.endDate) {
    const startDate = survey.startDate ? new Date(survey.startDate) : null;
    const endDate = survey.endDate ? new Date(survey.endDate) : null;

    if (startDate && now < startDate) {
        return res.render('surveys/respond', { survey, message: '설문 가능 기간이 아닙니다.' });
    }
    if (endDate && now > endDate) {
        return res.render('surveys/respond', { survey, message: '설문 기간이 종료되었습니다.' });
    }
  }

  // 설문조사 응답 페이지 렌더링
  res.render('surveys/respond', { survey, startedAt, message });
});

router.get('/surveys/:id/countResponses', async (req, res) => {
  const { date, time } = req.query;
  const surveyId = req.params.id;

  let count;

  // date와 time이 모두 있는 경우 (time-reservation)
  if (date && time) {
      const responseDateTime = `${date} ${time}`;
      count = await Response.countDocuments({
          surveyId: surveyId,
          'answers.answer': responseDateTime // 선택된 날짜와 시간에 대한 응답 수
      });
  } 
  // date만 있는 경우 (reservation)
  else if (date) {
      count = await Response.countDocuments({
          surveyId: surveyId,
          'answers.answer': date // 선택된 날짜에 대한 응답 수
      });
  }

  res.json({ count });
});


// 설문조사 수정 페이지
router.get('/surveys/:id/edit', isAdmin, async (req, res) => {
  const survey = await Survey.findById(req.params.id);
  res.render('surveys/edit', { survey });
});

// 설문조사 수정 처리
router.post('/surveys/:id', isAdmin, async (req, res) => {
  const { title, questions, startDate, endDate } = req.body;

  // 비어있는 필드 확인
  if (!questions || !Array.isArray(questions)) {
      console.error('Questions are missing or not an array');
      return res.status(400).send('Invalid questions format');
  }

  // 기존 설문조사 업데이트
  await Survey.findByIdAndUpdate(req.params.id, {
      title,
      questions: questions.map((question) => ({
          questionText: question.questionText,
          questionDescription: question.questionDescription,
          questionType: question.questionType,
          options: question.options || [],
          isRequired: question.isRequired === 'true',
          allowOther: question.allowOther === 'true',
          prefixText: question.prefixText || '',
          suffixText: question.suffixText || '',
          inputType: question.inputType || 'all',
          minValue: question.minValue || null,
          maxValue: question.maxValue || null,
          rankLimit: question.rankLimit || null,
          reservation: {
              startDate: question.reservation ? question.reservation.startDate : null,
              endDate: question.reservation ? question.reservation.endDate : null,
              maxParticipants: question.reservation ? question.reservation.maxParticipants : null,
              exceptionDates: question.reservation ? question.reservation.exceptionDates : [] // 기본값은 빈 배열
          },
          time_reservation: {
              availableDates: question.time_reservation ? question.time_reservation.availableDates : [],
              startTime: question.time_reservation ? question.time_reservation.startTime : null,
              endTime: question.time_reservation ? question.time_reservation.endTime : null,
              interval: question.time_reservation ? question.time_reservation.interval : null,
              maxParticipants: question.time_reservation ? question.time_reservation.maxParticipants : null
          }
      })),
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null
  });

  res.redirect('/admin/surveys');
});


// 설문조사 삭제 처리
router.post('/surveys/:id/delete', isAdmin, async (req, res) => {
  await Survey.findByIdAndDelete(req.params.id);
  res.redirect('/admin/surveys');
});

// 사용자 설문조사 목록 페이지
router.get('/surveys', async (req, res) => {
  const surveys = await Survey.find().populate('createdBy', 'username');
  res.render('surveys/survey', { surveys }); // 사용자 목록을 렌더링
});

// 설문조사 복제 처리
router.post('/surveys/:id/clone', isAdmin, async (req, res) => {
  const originalSurvey = await Survey.findById(req.params.id);

  if (!originalSurvey) {
      return res.status(404).send('설문조사를 찾을 수 없습니다.');
  }

  const clonedSurvey = new Survey({
      title: originalSurvey.title + ' (복제)', // 제목에 '(복제)' 추가
      questions: originalSurvey.questions.map(question => ({
          questionText: question.questionText,
          questionDescription: question.questionDescription,
          questionType: question.questionType,
          options: question.options,
          isRequired: question.isRequired,
          allowOther: question.allowOther,
          prefixText: question.prefixText,
          suffixText: question.suffixText,
          inputType: question.inputType,
          minValue: question.minValue,
          maxValue: question.maxValue,
          rankLimit: question.rankLimit,
          reservation: question.reservation,
          time_reservation: question.time_reservation
      })),
      startDate: originalSurvey.startDate,
      endDate: originalSurvey.endDate,
      createdBy: req.user._id
  });

  await clonedSurvey.save();
  res.redirect('/admin/surveys');
});

// 설문조사 결과 보기 페이지 (관리자용)
router.get('/surveys/:id/results', isAdmin, async (req, res) => {
  const responses = await Response.find({ surveyId: req.params.id }).populate('userId', 'username');
  const survey = await Survey.findById(req.params.id);
  res.render('surveys/results', { responses, survey });
});

module.exports = router;
