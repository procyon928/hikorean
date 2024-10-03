const express = require('express');
const router = express.Router();
const Schedule = require('../models/Schedule');
const { isAdmin } = require('../middleware/auth');

// 스케줄 목록 조회
router.get('/', isAdmin, async (req, res) => {
  const { semester } = req.query; // 학기 쿼리 파라미터 받기
  try {
      const schedules = semester ? await Schedule.find({ semester }) : await Schedule.find(); // 학기별 필터링
      res.render('admin/schedule', { schedules }); // HTML로 렌더링
  } catch (err) {
      res.status(500).send(err.message);
  }
});

// 추가: AJAX 요청 시 학기별 스케줄만 반환
router.get('/filter', isAdmin, async (req, res) => {
  const { semester } = req.query; // 학기 쿼리 파라미터 받기
  try {
      const schedules = semester ? await Schedule.find({ semester }) : await Schedule.find(); // 학기별 필터링
      let html = '';
      schedules.forEach(schedule => {
          html += `<tr>
              <td>${schedule.title}</td>
              <td>${schedule.category}</td>
              <td>${schedule.semester}</td>
              <td>${schedule.startDate ? new Date(new Date(schedule.startDate).getTime() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 16) : '없음'}</td>
              <td>${schedule.endDate ? new Date(new Date(schedule.endDate).getTime() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 16) : '없음'}</td>
              <td>${schedule.description}</td>
              <td><a href="${schedule.link}">링크</a></td>
              <td>
                  <button class="btn btn-danger delete-schedule" data-id="${schedule._id}">삭제</button>
              </td>
          </tr>`;
      });
      res.send(html); // 생성된 HTML 반환
  } catch (err) {
      res.status(500).send(err.message);
  }
});

// 스케줄 추가
router.post('/', isAdmin, async (req, res) => {
  const { semester, title, category, startDateTime, endDateTime, description, link } = req.body;
    try {
        // 날짜와 시간 값 합치기
        const startDateTimeObj = new Date(startDateTime);
        const endDateTimeObj = endDateTime ? new Date(endDateTime) : null;

        const newSchedule = new Schedule({ 
            semester,
            title, 
            category, 
            startDate: startDateTimeObj, 
            endDate: endDateTimeObj, 
            description, 
            link 
        });
        await newSchedule.save();
        res.redirect('/admin/schedule');
    } catch (err) {
        res.status(400).send(err.message);
    }
});

// 스케줄 수정
router.put('/:id', isAdmin, async (req, res) => {
  const { id } = req.params;
  const { title, category, startDateTime, endDateTime, description, link } = req.body;
  try {
      // 날짜와 시간 값 통합
      const startDateTimeObj = new Date(startDateTime);
      const endDateTimeObj = endDateTime ? new Date(endDateTime) : null;

      await Schedule.findByIdAndUpdate(id, { 
          title, 
          category, 
          startDate: startDateTimeObj, 
          endDate: endDateTimeObj, 
          description, 
          link 
      });
      res.redirect('/admin/schedule');
  } catch (err) {
      res.status(400).send(err.message);
  }
});

// 스케줄 삭제
router.delete('/:id', isAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        await Schedule.findByIdAndDelete(id);
        res.redirect('/admin/schedule');
    } catch (err) {
        res.status(400).send(err.message);
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
      res.json(schedules);
  } catch (err) {
      console.error(err);
      res.status(500).send(err.message);
  }
});

module.exports = router;
