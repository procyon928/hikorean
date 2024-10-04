const express = require('express');
const bcrypt = require('bcrypt'); // bcrypt 추가
const { User } = require('../models/User');
const Log = require('../models/Log');

const router = express.Router();

// 회원가입 기능
router.post('/signup', async (req, res) => {
  const { username, email, password } = req.body;

  try {
      // 비밀번호 해싱
      const hashedPassword = await bcrypt.hash(password, 10); // 비밀번호 해싱

      const newUser = new User({ username, email, password: hashedPassword }); // 해싱된 비밀번호 저장
      await newUser.save();

      // 회원가입 성공 후 로그인 페이지로 리다이렉트
      res.render('signup', { success: true }); // success 변수를 true로 설정하여 리다이렉션 메시지 표시
  } catch (error) {
      console.error('회원가입 오류:', error);
      res.status(500).send('회원가입 중 오류가 발생했습니다.');
  }
});

// 로그인 기능
router.post('/login', async (req, res) => {
  const { username, password, referer } = req.body; // referer 추가

  try {
      const user = await User.findOne({ username });

      // 사용자 존재 여부 확인
      if (!user) {
          return res.status(401).send('아이디 또는 비밀번호가 잘못되었습니다.');
      }

      // 비밀번호 확인
      const isMatch = await bcrypt.compare(password, user.password); // 해싱된 비밀번호와 비교
      if (!isMatch) {
          return res.status(401).send('아이디 또는 비밀번호가 잘못되었습니다.');
      }

      // 사용자 정보를 세션에 저장
      req.session.user = {
          id: user._id,
          role: user.role,
          username: user.username,
          email: user.email
      };

      // 로그인 로그 추가
      const logEntry = new Log({
          action: 'login',
          user: user.username,
          details: '사용자가 로그인했습니다.',
          timestamp: new Date()
      });
      await logEntry.save();

      // referer가 있으면 해당 페이지로 리다이렉션, 없으면 기본 페이지로
      res.redirect(referer || '/');
  } catch (error) {
      console.error('로그인 오류:', error);
      res.status(500).send('로그인 중 오류가 발생했습니다.');
  }
});

module.exports = router;
