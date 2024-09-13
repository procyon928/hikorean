const express = require('express');
const Survey = require('../models/Survey');
const Response = require('../models/Response');
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
    const { title, questions } = req.body;
    const survey = new Survey({ title, questions, createdBy: req.session.user._id });
    await survey.save();
    res.redirect('/survey/list');
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

// 설문조사 응답 페이지
router.get('/:id/respond', ensureAuthenticated, async (req, res) => {
    const survey = await Survey.findById(req.params.id);
    res.render('surveys/respond', { survey });
});

// 응답 처리
router.post('/:id/respond', ensureAuthenticated, async (req, res) => {
    const response = new Response({
        surveyId: req.params.id,
        userId: req.session.user._id,
        answers: req.body.answers
    });
    await response.save();
    res.redirect('/survey');
});

// 설문조사 결과 보기 페이지 (관리자용)
router.get('/:id/results', isAdmin, async (req, res) => {
    const responses = await Response.find({ surveyId: req.params.id }).populate('userId', 'username');
    res.render('surveys/results', { responses });
});

module.exports = router;
