const express = require('express');
const Response = require('../models/Response');
const mongoose = require('mongoose');

const router = express.Router();

// 응답 제출
router.post('/responses', async (req, res) => {
    try {
        const userId = req.user ? req.user._id : req.ip; // 로그인한 경우 userId 설정, 비회원일 경우 IP 주소 사용
        const response = new Response({
            ...req.body,
            userId: userId, // 세션에서 사용자 ID 또는 IP 주소 가져오기
        });
        await response.save();
        res.status(201).json(response);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// 특정 설문조사의 모든 응답 조회
router.get('/responses/:surveyId', async (req, res) => { // ensureAuthenticated 제거
    try {
        const responses = await Response.find({ surveyId: req.params.surveyId }).populate('userId');
        res.json(responses);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// 특정 사용자의 모든 응답 조회
router.get('/responses/user/:userId', async (req, res) => { // ensureAuthenticated 제거
    try {
        const responses = await Response.find({ userId: req.params.userId }).populate('surveyId');
        res.json(responses);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// 응답 수정
router.put('/responses/:id', async (req, res) => { // ensureAuthenticated 제거
    try {
        const response = await Response.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!response) return res.status(404).json({ message: '응답을 찾을 수 없습니다.' });
        res.json(response);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// 응답 삭제
router.delete('/responses/:id', async (req, res) => { // ensureAuthenticated 제거
    try {
        const response = await Response.findByIdAndDelete(req.params.id);
        if (!response) return res.status(404).json({ message: '응답을 찾을 수 없습니다.' });
        res.json({ message: '응답이 삭제되었습니다.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
