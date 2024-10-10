const express = require('express');
const nodemailer = require('nodemailer');
const Log = require('../models/Log');
const { ensureAuthenticated } = require('../middleware/auth'); // 인증 미들웨어 추가

const router = express.Router();

// 메일 발송 기능
router.post('/send-email', ensureAuthenticated, async (req, res) => { // 미들웨어 추가
  const { recipient, subject, message } = req.body;
  const user = req.user; // 세션에서 사용자 정보 가져오기

  const transporter = nodemailer.createTransport({
      host: 'smtp.daum.net',
      port: 465,
      secure: true,
      auth: {
          user: 'hongik@hikorean.co.kr',
          pass: process.env.EMAIL_PASSWORD
      }
  });

  const mailOptions = {
      from: 'hongik@hikorean.co.kr',
      to: recipient,
      subject: subject,
      text: message,
  };

  try {
      const info = await transporter.sendMail(mailOptions);
      console.log('메일 발송 결과:', info);

      // 사용자 정보 확인
      if (!user || !user.username) {
        console.error('사용자 정보가 없습니다:', user);
        return res.status(400).send('사용자 정보가 없습니다.');
      }

      // 이메일 발송 로그 추가
      const logEntry = new Log({
          action: 'email_sent',
          user: user.username, // 로그인한 사용자 정보
          details: `${recipient}`
      });
      await logEntry.save();

      // JSON 형식으로 응답
      return res.json({ message: '메일이 성공적으로 발송되었습니다.' });
  } catch (error) {
      console.error('메일 발송 오류:', error);
      return res.status(500).json({ message: '메일 발송 오류, 관리자에게 문의하세요.' });
  }
});

// 검증 코드 메일 발송 기능
router.post('/send-VerifyEmail', async (req, res) => { // ensureAuthenticated 미들웨어 제거
  const { recipient, subject, message } = req.body;

  const transporter = nodemailer.createTransport({
      host: 'smtp.daum.net',
      port: 465,
      secure: true,
      auth: {
          user: 'hongik@hikorean.co.kr',
          pass: process.env.EMAIL_PASSWORD
      }
  });

  const mailOptions = {
      from: 'hongik@hikorean.co.kr',
      to: recipient,
      subject: subject,
      text: message,
  };

  try {
      const info = await transporter.sendMail(mailOptions);
      console.log('메일 발송 결과:', info);

      // 사용자 정보 확인 (로그인된 사용자가 아닐 경우 null일 수 있음)
      const user = req.user; // 세션에서 사용자 정보 가져오기

      // 이메일 발송 로그 추가 (로그인된 사용자만 로그 추가)
      if (user && user.username) {
          const logEntry = new Log({
              action: 'email_sent',
              user: user.username, // 로그인한 사용자 정보
              details: `${recipient}`
          });
          await logEntry.save();
      }

      // JSON 형식으로 응답
      return res.json({ message: '검증 코드가 성공적으로 발송되었습니다. 이메일을 확인해 주세요.' });
  } catch (error) {
      console.error('메일 발송 오류:', error);
      return res.status(500).json({ message: '메일 발송 오류, 관리자에게 문의하세요.' });
  }
});

module.exports = router;
