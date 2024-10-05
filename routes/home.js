// routes/home.js
const express = require('express');
const router = express.Router();
const Schedule = require('../models/Schedule');
const fs = require('fs');

// 휴일 목록 불러오기
const holidaysArray = JSON.parse(fs.readFileSync('data/holidays.json', 'utf-8'));

// 객체로 변환 (optional)
const holidays = holidaysArray.map(item => ({
    date: item[0],
    name: item[1]
}));

// 홈 페이지 렌더링
router.get('/', async (req, res) => {
    const lang = req.query.lang || 'ko'; // 쿼리 파라미터가 없으면 기본값으로 'ko' 설정

    // lang 파라미터가 없을 때만 리다이렉트
    if (!req.query.lang) {
        return res.redirect(`/?lang=${lang}`); // 기본 언어로 리다이렉트
    }

    try {
        const schedules = await Schedule.find(); // 모든 스케줄 가져오기

        // 현재 시간 (서버가 KST로 운영되므로 직접 사용)
        const todayKST = new Date(); // 서버의 현재 시간

        console.log('Schedules:', schedules); // 추가된 로그
        res.render('home', { schedules, todayKST, holidays, lang }); // 스케줄 데이터와 today, lang을 뷰로 전달
    } catch (err) {
        console.error(err);
        res.status(500).send(err.message);
    }
});

// 스케줄 가져오기
router.get('/schedules', async (req, res) => {
    const date = new Date(req.query.date);
    const startOfDay = new Date(date.setHours(0, 0, 0, 0));
    const endOfDay = new Date(date.setHours(23, 59, 59, 999));

    try {
        const schedules = await Schedule.find({
            startDate: { $gte: startOfDay, $lte: endOfDay }
        });
        res.json(schedules); // JSON 형식으로 응답
    } catch (err) {
        console.error(err);
        res.status(500).send(err.message);
    }
});

module.exports = router;
