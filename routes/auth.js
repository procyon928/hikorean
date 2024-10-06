const express = require('express');
const passport = require('passport'); // passport를 import합니다.
const bcrypt = require('bcryptjs'); // bcrypt 추가
const { User } = require('../models/User');
const Log = require('../models/Log');

const router = express.Router();

// 회원가입 페이지 라우터에서 GET 요청 처리
router.get('/signup', (req, res) => {
  res.render('signup', { success: false }); // 기본값으로 false 설정
});

// 회원가입 기능
router.post('/signup', async (req, res) => {
  const { username, email, password } = req.body;

  try {
      // 비밀번호 해싱
      const hashedPassword = await bcrypt.hash(password, 10); // 비밀번호 해싱

      const newUser = new User({ username, email, password: hashedPassword }); // 해싱된 비밀번호 저장
      await newUser.save();

      // 회원가입 후 자동 로그인
      req.login(newUser, (err) => {
        if (err) return res.status(500).send('로그인 중 오류가 발생했습니다.');
        res.redirect('/'); // 로그인 후 메인 페이지로 리다이렉트
    });
  } catch (error) {
      console.error('회원가입 오류:', error);
      res.status(500).send('회원가입 중 오류가 발생했습니다.');
  }
});

// 로그인 기능
router.post('/login', async (req, res) => {
  const { username, password, referer } = req.body;

  try {
      const user = await User.findOne({ username });

      // 사용자 존재 여부 확인
      if (!user) {
          return res.status(401).send('아이디 또는 비밀번호가 잘못되었습니다.');
      }

      // 비밀번호 확인
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
          return res.status(401).send('아이디 또는 비밀번호가 잘못되었습니다.');
      }

      // Passport에 사용자 정보 저장
      req.login(user, async (err) => {
          if (err) return res.status(500).send('로그인 중 오류가 발생했습니다.');

          // 로그인 로그 추가
          const logEntry = new Log({
              action: 'login',
              user: user.username,
              details: '사용자가 로그인했습니다.',
              timestamp: new Date()
          });
          await logEntry.save();

          console.log('로그인 후 세션 정보:', req.session); // 세션 정보 확인
          res.redirect(referer || '/'); // referer가 있으면 해당 페이지로 리다이렉션
      });
  } catch (error) {
      console.error('로그인 오류:', error);
      res.status(500).send('로그인 중 오류가 발생했습니다.');
  }
});

// Google 인증 요청
router.get('/auth/google', (req, res, next) => {
  const isLoggedIn = req.isAuthenticated(); // 사용자가 로그인했는지 확인

  passport.authenticate('google', {
      scope: ['openid', 'profile', 'email'],
      ...(isLoggedIn ? { prompt: 'none' } : {}) // 로그인 상태에 따라 prompt 설정
  })(req, res, next);
});


// Google 인증 후 리디렉션
router.get('/auth/google/callback',
  passport.authenticate('google', {
      failureRedirect: '/login' // 인증 실패 시 리디렉션
  }),
  (req, res) => {
      res.redirect('/');
  }
);

module.exports = router;
