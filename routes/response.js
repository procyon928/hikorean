const express = require('express');
const Response = require('../models/Response');
const { ensureAuthenticated } = require('../middleware/auth');

const router = express.Router();

// 응답 제출
router.post('/responses', ensureAuthenticated, async (req, res) => {
    try {
        const response = new Response({
            ...req.body,
            userId: req.session.user._id, // 세션에서 사용자 ID 가져오기
        });
        await response.save();
        res.status(201).json(response);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// 특정 설문조사의 모든 응답 조회
router.get('/responses/:surveyId', ensureAuthenticated, async (req, res) => {
    try {
        const responses = await Response.find({ surveyId: req.params.surveyId }).populate('userId');
        res.json(responses);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// 특정 사용자의 모든 응답 조회
router.get('/responses/user/:userId', ensureAuthenticated, async (req, res) => {
    try {
        const responses = await Response.find({ userId: req.params.userId }).populate('surveyId');
        res.json(responses);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// 응답 수정
router.put('/responses/:id', ensureAuthenticated, async (req, res) => {
    try {
        const response = await Response.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!response) return res.status(404).json({ message: '응답을 찾을 수 없습니다.' });
        res.json(response);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// 응답 삭제
router.delete('/responses/:id', ensureAuthenticated, async (req, res) => {
    try {
        const response = await Response.findByIdAndDelete(req.params.id);
        if (!response) return res.status(404).json({ message: '응답을 찾을 수 없습니다.' });
        res.json({ message: '응답이 삭제되었습니다.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
