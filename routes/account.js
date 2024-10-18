const express = require('express');
const { User } = require('../models/User'); // User 모델 가져오기
const bcrypt = require('bcryptjs'); // 비밀번호 해싱을 위한 bcrypt
const router = express.Router();
const axios = require('axios'); // axios 패키지 추가

// 회원 페이지
router.get('/account', (req, res) => {
    // console.log('세션 정보:', req.session);
    if (!req.user) {
        return res.redirect('/login'); // 로그인하지 않은 경우 로그인 페이지로 리다이렉트
    }
    res.render('account', { user: req.user }); // 사용자 정보를 전달
});

// 회원 정보 수정
router.post('/account/update', async (req, res) => {
    const { username, email } = req.body;
    try {
        await User.updateOne({ _id: req.user._id }, { username, email }); // req.user로 수정
        req.user.username = username; // 세션 정보 업데이트
        req.user.email = email;
        res.redirect('/account'); // 수정 후 회원 페이지로 리다이렉트
    } catch (error) {
        console.error('회원 정보 수정 오류:', error);
        res.status(500).send('회원 정보 수정 중 오류가 발생했습니다.');
    }
});

// 비밀번호 변경
router.post('/account/change-password', async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    try {
        const user = await User.findById(req.user._id); // req.user로 수정
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(401).send('현재 비밀번호가 잘못되었습니다.');
        }
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await User.updateOne({ _id: user._id }, { password: hashedPassword });
        res.redirect('/account'); // 비밀번호 변경 후 회원 페이지로 리다이렉트
    } catch (error) {
        console.error('비밀번호 변경 오류:', error);
        res.status(500).send('비밀번호 변경 중 오류가 발생했습니다.');
    }
});

// 로그아웃
router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).send('로그아웃 중 오류가 발생했습니다.');
        }
        res.redirect('/'); // 로그아웃 후 메인 페이지로 리다이렉트
    });
});

// 계정 삭제 처리
router.post('/account/delete', async (req, res) => {
  const user = req.user; // 현재 로그인한 사용자 정보

  try {
      if (user.authProvider === 'google') {
          // 구글 사용자: 동의 철회 요청
          const accessToken = user.refreshToken; // 사용자의 refreshToken 사용

          // Google API에서 동의 철회
          await axios.post(`https://oauth2.googleapis.com/revoke?token=${accessToken}`)
              .then(response => {
                  console.log('동의 철회 성공:', response.data);
              })
              .catch(err => {
                  console.error('동의 철회 오류:', err);
              });
      }

      // DB에서 사용자 삭제
      await User.deleteOne({ _id: user._id });

      // 세션 종료
      req.logout((err) => { // 콜백 함수 추가
          if (err) {
              return res.status(500).send('로그아웃 중 오류가 발생했습니다.');
          }
          req.session.destroy((err) => {
              if (err) {
                  return res.status(500).send('로그아웃 중 오류가 발생했습니다.');
              }
              res.redirect('/'); // 메인 페이지로 리다이렉트
          });
      });
  } catch (error) {
      console.error('계정 삭제 오류:', error);
      res.status(500).send('계정 삭제 중 오류가 발생했습니다.');
  }
});

module.exports = router;
