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
  try {
      const schedules = await Schedule.find(); // 모든 스케줄 가져오기

      // 오늘 날짜를 KST로 변환
      const today = new Date();
      const timezoneOffset = today.getTimezoneOffset() * 60 * 1000; // UTC 오프셋을 밀리초로 변환
      const koreaOffset = 9 * 60 * 60 * 1000; // KST 오프셋 (9시간)
      const todayKST = new Date(today.getTime() + timezoneOffset + koreaOffset); // 오늘 날짜를 KST로 변환

      console.log('Schedules:', schedules); // 추가된 로그
      res.render('home', { schedules, todayKST, holidays }); // 스케줄 데이터와 todayKST를 뷰로 전달
  } catch (err) {
      console.error(err);
      res.status(500).send(err.message);
  }
});

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
