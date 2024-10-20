const express = require('express');
const mongoose = require('mongoose');
const Survey = require('../models/Survey');
const Response = require('../models/Response');
const { isAdmin } = require('../middleware/auth');
const { translateWithGoogle } = require('./translate');

const router = express.Router();

// 설문조사 목록 페이지
router.get('/admin/surveys', isAdmin, async (req, res) => {
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
  const { title, questions, startDate, endDate, submitResult } = req.body;

  // 비어있는 필드 확인
  if (!questions || !Array.isArray(questions)) {
      console.error('Questions are missing or not an array');
      return res.status(400).send('Invalid questions format');
  }

  // 다국어 제목 및 질문 처리
  const formattedTitle = { ko: title }; // 기본값 한국어
  const formattedQuestions = questions.map(question => ({
      questionText: { ko: question.questionText }, // 한국어
      questionDescription: { ko: question.questionDescription }, // 한국어
      questionType: question.questionType,
      inputType: question.inputType,
      options: question.options.map(option => ({ ko: option })), // 각 옵션도 한국어로 저장
      minValue: question.minValue,
      maxValue: question.maxValue,
      isRequired: question.isRequired === 'true',
      allowOther: question.allowOther === 'true',
      rankLimit: question.rankLimit,
      prefixText: { ko: question.prefixText || '' }, // 한국어
      suffixText: { ko: question.suffixText || '' }, // 한국어
      reservation: {
          startDate: question.reservation ? question.reservation.startDate.split('T')[0] : null,
          endDate: question.reservation ? question.reservation.endDate.split('T')[0] : null,
          maxParticipants: question.reservation ? question.reservation.maxParticipants : null,
          exceptionDates: question.reservation && question.reservation.exceptionDates 
              ? question.reservation.exceptionDates.split(',').map(date => date.trim())
              : []  
      },
      time_reservation: {
          availableDates: question.time_reservation && question.time_reservation.availableDates 
          ? question.time_reservation.availableDates.split(',').map(date => date.trim())
              : [],
          startTime: question.time_reservation ? question.time_reservation.startTime : null,
          endTime: question.time_reservation ? question.time_reservation.endTime : null,
          interval: question.time_reservation ? question.time_reservation.interval : null,
          maxParticipants: question.time_reservation ? question.time_reservation.maxParticipants : null
      },
      infoText: { ko: question.infoText || null } // 한국어
  }));

  const survey = new Survey({
      title: formattedTitle,
      questions: formattedQuestions,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      createdBy: req.user._id,
      submitResult: { ko: submitResult }
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
  const { answers, startedAt, email, lang } = req.body;
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
  
      let answer = answerObj.answer; // 응답이 없으면 빈 문자열로 처리
      const questionId = answerObj.questionId || question._id; // questionId 초기화
      const otherAnswer = answerObj.otherAnswer || ""; // otherAnswer 초기화

      // '기타 응답'이 포함된 경우, answer를 otherAnswer와 함께 설정
      if (Array.isArray(answer) && answer.includes('기타 응답')) {
          answer = answer.filter(item => item !== '기타 응답'); // '기타 응답' 제거
          if (otherAnswer.trim() !== "") {
              answer.push(otherAnswer); // otherAnswer 추가
          }
      } else if (answer === '기타 응답') {
          answer = otherAnswer; // otherAnswer의 값을 사용
      }

      // 필수 문항 체크
      if (question.isRequired) {
        // 다중 선택 질문의 경우
        if (question.questionType === 'multiple_choice') {
            // 최소 하나 이상의 선택이 필요
            if (!Array.isArray(answer) || answer.length === 0) {
                if (question.allowOther && otherAnswer.trim() !== "") {
                    // '기타 응답'이 선택되었고 값이 입력된 경우 유효
                    formattedAnswers.push({
                        questionId,
                        answer: otherAnswer,
                    });
                    answerIndex++;
                    continue; // 다음 질문으로 넘어감
                }
    
                return res.status(400).send(`문항 ${i + 1}은 필수입니다.`);
            }
        } else { // 단일 선택 질문의 경우
            if (typeof answer === 'string' && answer.trim() === "") {
                return res.status(400).send(`문항 ${i + 1}은 필수입니다.`);
            }
        }
      }

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
              answer: answer, // '기타 응답'이 포함된 경우, 기존 답변과 otherAnswer를 사용
              otherAnswer: otherAnswer
          });
      }

      // 추가적인 검증 로직
      if (question.questionType === 'short_answer') {
          const inputType = question.inputType; // inputType 사용

          if (inputType === 'integer') {
              // 필수 문항이 아닐 경우, 응답이 없으면 검증을 생략
              if (question.isRequired || answer.trim() !== "") {
                  const minValue = parseInt(answerObj.minValue, 10); // 최소값 가져오기
                  const maxValue = parseInt(answerObj.maxValue, 10); // 최대값 가져오기

                  // 정수 입력 유효성 검사
                  const answerValue = parseInt(answer, 10);
                  if (!Number.isInteger(answerValue) || answerValue < minValue || answerValue > maxValue) {
                      return res.status(400).send(`문항 ${i + 1}의 입력값은 ${minValue}와 ${maxValue} 사이의 정수여야 합니다.`);
                  }
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

  // 응답 객체 생성
  const userId = req.user ? req.user._id : new mongoose.Types.ObjectId(); // 로그인한 경우 userId 설정, 비회원일 경우 임시 ObjectId 생성
  const response = new Response({
      surveyId: req.params.id,
      userId: userId, // userId에 회원 ID 또는 임시 ObjectId 설정
      answers: formattedAnswers, // 포맷팅된 answers 사용
      startedAt: new Date(startedAt),
      submittedAt: new Date(),
      email,
      lang
  });
  await response.save();

  // 제출 후 세션에 formattedAnswers 저장
  req.session.formattedAnswers = formattedAnswers; // 세션에 저장
  
  // 제출 후 세션 초기화
  req.session.formData = null; // 세션에서 폼 데이터 삭제
  
  // 결과 페이지로 리다이렉트
  res.redirect(`/surveys/${req.params.id}/confirm?lang=${lang}`);
});

// 확인 페이지 라우터 추가
router.get('/surveys/:id/confirm', async (req, res) => {
  const survey = await Survey.findById(req.params.id);
  if (!survey) {
      return res.status(404).send('설문을 찾을 수 없습니다.');
  }

  const submitResult = survey.submitResult || {}; // 기본값 설정
  const formattedAnswers = req.session.formattedAnswers || []; // 세션에서 답변 가져오기

  // 질문 제목을 가져옵니다.
  const questionTitles = survey.questions.map(question => question.questionText[req.query.lang] || question.questionText['ko']);

  // 세션에서 formattedAnswers 삭제 (한 번만 사용하도록)
  req.session.formattedAnswers = null;

  res.render('surveys/confirm', {
      survey: survey,
      submitResult: submitResult,
      formattedAnswers: formattedAnswers, // 응답 결과
      questionTitles: questionTitles, // 질문 제목 전달
      lang: req.query.lang || 'ko' // 언어 설정
  });
});

// 설문조사 응답 페이지
router.get('/surveys/:id/respond', async (req, res) => {
  const survey = await Survey.findById(req.params.id);
  const now = new Date();

  let message = null;

  // 현재 시간을 시작 시간으로 설정
  const startedAt = new Date();

  // 시작 날짜와 종료 날짜 확인
  const startDate = survey.startDate ? new Date(survey.startDate) : null;
  const endDate = survey.endDate ? new Date(survey.endDate) : null;

  if (startDate && now < startDate) {
      message = '설문 가능 기간이 아닙니다.';
  } else if (endDate && now > endDate) {
      message = '설문 기간이 종료되었습니다.';
  }

  // 쿼리 파라미터에서 언어 가져오기
  const lang = req.query.lang || 'ko'; // 기본값 한국어
  let formattedStartDate = null, formattedEndDate = null; // 초기화

  // 언어에 따른 locale 설정
  const localeMap = {
      ko: 'ko-KR',
      en: 'en-US',
      sc: 'zh-CN',
      tc: 'zh-TW',
      jp: 'ja-JP',
      vi: 'vi-VN'
  };

  // 날짜 형식 결정 (모두 Asia/Seoul로 통일)
  const locale = localeMap[lang] || 'ko-KR'; // 기본값 한국어

  // 항상 날짜 형식 변환
  formattedStartDate = survey.startDate ? new Date(survey.startDate).toLocaleString(locale, { timeZone: 'Asia/Seoul' }) : null;
  formattedEndDate = survey.endDate ? new Date(survey.endDate).toLocaleString(locale, { timeZone: 'Asia/Seoul' }) : null;

  // 설문조사 응답 페이지 렌더링
  res.render('surveys/respond', { survey, startedAt, message, formattedStartDate, formattedEndDate });
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
  console.log(req.body);
  const { title, questions, startDate, endDate, lang, submitResult } = req.body;

  // 비어있는 필드 확인
  if (!questions || !Array.isArray(questions)) {
      console.error('Questions are missing or not an array');
      return res.status(400).send('Invalid questions format');
  }

  // 기존 설문조사 객체를 가져옵니다.
  const survey = await Survey.findById(req.params.id);

  // 기존 제목을 업데이트합니다.
  const updatedTitle = {
      ...survey.title,
      [lang]: title[lang] !== undefined && title[lang] !== '' ? title[lang] : survey.title[lang] // 기존 값 유지
  };

  // 결과 메시지를 업데이트합니다.
  const updatedSubmitResult = {
      ...survey.submitResult,
      [lang]: submitResult && submitResult[lang] !== undefined && submitResult[lang] !== '' ? submitResult[lang] : survey.submitResult[lang] // 기존 값 유지
  };

  // 질문을 업데이트합니다.
  const updatedQuestions = questions.map((question, index) => {
      const existingQuestion = survey.questions[index]; // 기존 질문을 가져옵니다.
      
      return {
          questionText: {
              ...existingQuestion.questionText,
              [lang]: question.questionText[lang] !== undefined && question.questionText[lang] !== '' ? question.questionText[lang] : existingQuestion.questionText[lang] // 기존 값 유지
          },
          questionDescription: {
              ...existingQuestion.questionDescription,
              [lang]: question.questionDescription[lang] !== undefined && question.questionDescription[lang] !== '' ? question.questionDescription[lang] : existingQuestion.questionDescription[lang] // 기존 값 유지
          },
          questionType: question.questionType,
          options: question.options.map((option, optionIndex) => {
              const existingOption = existingQuestion.options[optionIndex]; // 기존 옵션을 가져옵니다.
              return {
                  ...existingOption,
                  [lang]: option[lang] !== undefined && option[lang] !== '' ? option[lang] : existingOption[lang] // 기존 값 유지
              };
          }),
          isRequired: question.isRequired === 'true',
          allowOther: question.allowOther === 'true',
          prefixText: {
              ...existingQuestion.prefixText,
              [lang]: question.prefixText[lang] !== undefined && question.prefixText[lang] !== '' ? question.prefixText[lang] : existingQuestion.prefixText[lang] // 기존 값 유지
          },
          suffixText: {
              ...existingQuestion.suffixText,
              [lang]: question.suffixText[lang] !== undefined && question.suffixText[lang] !== '' ? question.suffixText[lang] : existingQuestion.suffixText[lang] // 기존 값 유지
          },
          inputType: question.inputType || 'all',
          minValue: question.minValue || null,
          maxValue: question.maxValue || null,
          rankLimit: question.rankLimit || null,
          reservation: {
              startDate: existingQuestion.reservation ? existingQuestion.reservation.startDate : null,
              endDate: existingQuestion.reservation ? existingQuestion.reservation.endDate : null,
              maxParticipants: existingQuestion.reservation ? existingQuestion.reservation.maxParticipants : null,
              exceptionDates: existingQuestion.reservation ? existingQuestion.reservation.exceptionDates : []
          },
          time_reservation: {
              availableDates: existingQuestion.time_reservation ? existingQuestion.time_reservation.availableDates : [],
              startTime: existingQuestion.time_reservation ? existingQuestion.time_reservation.startTime : null,
              endTime: existingQuestion.time_reservation ? existingQuestion.time_reservation.endTime : null,
              interval: existingQuestion.time_reservation ? existingQuestion.time_reservation.interval : null,
              maxParticipants: existingQuestion.time_reservation ? existingQuestion.time_reservation.maxParticipants : null
          },
          infoText: {
              ...existingQuestion.infoText,
              [lang]: question.infoText[lang] !== undefined && question.infoText[lang] !== '' ? question.infoText[lang] : existingQuestion.infoText[lang] // 기존 값 유지
          }
      };
  });

  // tc 번역 업데이트
  if (lang === 'sc' && !survey.title.tc) {
    // 제목 번역
    updatedTitle.tc = updatedTitle[lang] ? await translateWithGoogle(updatedTitle[lang], 'zh-TW', 'zh-CN') : ''; // sc 값이 없으면 tc도 빈 문자열로 설정

    // 결과 메시지 번역
    updatedSubmitResult.tc = updatedSubmitResult[lang] ? await translateWithGoogle(updatedSubmitResult[lang], 'zh-TW', 'zh-CN') : ''; // sc 값이 없으면 tc도 빈 문자열로 설정

    // 질문 번역
    await Promise.all(updatedQuestions.map(async (question) => {
        question.questionText.tc = question.questionText[lang] ? await translateWithGoogle(question.questionText[lang], 'zh-TW', 'zh-CN') : ''; // sc 값이 없으면 tc도 빈 문자열로 설정
        question.questionDescription.tc = question.questionDescription[lang] ? await translateWithGoogle(question.questionDescription[lang], 'zh-TW', 'zh-CN') : ''; // sc 값이 없으면 tc도 빈 문자열로 설정

        // infoText 번역
        question.infoText.tc = question.infoText[lang] ? await translateWithGoogle(question.infoText[lang], 'zh-TW', 'zh-CN') : ''; // sc 값이 없으면 tc도 빈 문자열로 설정

        // 옵션 번역
        await Promise.all(question.options.map(async (option) => {
            option.tc = option[lang] ? await translateWithGoogle(option[lang], 'zh-TW', 'zh-CN') : ''; // sc 값이 없으면 tc도 빈 문자열로 설정
        }));
    }));
  }

  // 수정 시간과 수정한 사람 기록
  const now = new Date(); // 현재 시간
  const userId = req.user.username; // 수정한 사람 (로그인한 사용자 이름 또는 '관리자')

  // Survey 업데이트
  await Survey.findByIdAndUpdate(req.params.id, {
      title: updatedTitle,
      questions: updatedQuestions,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      submitResult: updatedSubmitResult,
      lang: req.query.lang || 'ko',
      updatedAt: {
          ...survey.updatedAt, // 기존 값을 유지
          [lang]: now // 수정 시간 기록
      },
      updatedBy: {
          ...survey.updatedBy, // 기존 값을 유지
          [lang]: userId // 수정한 사람 기록
      }
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
      title: {
          ...originalSurvey.title,
          ko: originalSurvey.title.ko + ' (복사본)' // 제목에 '(복제)' 추가
      },
      questions: originalSurvey.questions.map(question => ({
          questionText: question.questionText,
          questionDescription: question.questionDescription,
          questionType: question.questionType,
          options: question.options.map(option => ({
              ...option // 다국어 지원을 위한 객체
          })),
          isRequired: question.isRequired,
          allowOther: question.allowOther,
          prefixText: question.prefixText,
          suffixText: question.suffixText,
          inputType: question.inputType,
          minValue: question.minValue,
          maxValue: question.maxValue,
          rankLimit: question.rankLimit,
          reservation: question.reservation,
          time_reservation: question.time_reservation,
          infoText: question.infoText
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
  const responses = await Response.find({ surveyId: req.params.id })
    .populate('userId', 'username'); // userId가 ObjectId로 변경되었으므로 populate 가능

  const survey = await Survey.findById(req.params.id);
  res.render('surveys/results', { responses, survey });
});

module.exports = router;
