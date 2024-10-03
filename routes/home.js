// routes/home.js
const express = require('express');
const router = express.Router();
const Schedule = require('../models/Schedule');

// 홈 페이지 렌더링
router.get('/', async (req, res) => {
  try {
      const schedules = await Schedule.find(); // 모든 스케줄 가져오기
      console.log('Schedules:', schedules); // 추가된 로그
      res.render('home', { schedules }); // 스케줄 데이터를 뷰로 전달
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
