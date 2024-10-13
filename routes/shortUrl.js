const express = require('express');
const { isAdmin } = require('../middleware/auth');
const ShortUrl = require('../models/ShortUrl');
const QRCode = require('qrcode');

const router = express.Router();

// 랜덤 세 자리 문자열 생성 함수
function generateRandomShortId() {
  const chars = 'abcdefghijklmnopqrstuvwxyz'; // 0123456789
  let result = '';
  for (let i = 0; i < 3; i++) {
      const randomIndex = Math.floor(Math.random() * chars.length);
      result += chars[randomIndex];
  }
  return result;
}

// 짧은 URL 생성 처리
router.post('/admin/short-url', isAdmin, async (req, res) => {
  const { originalUrl, title } = req.body;

  let shortUrl; // shortUrl 변수를 선언
  let existingShortUrl; // existingShortUrl 변수를 선언

  // 중복되지 않는 shortUrl을 찾을 때까지 반복
  do {
      shortUrl = generateRandomShortId();
      console.log('생성된 shortUrl:', shortUrl);
      existingShortUrl = await ShortUrl.findOne({ shortUrl });
  } while ( existingShortUrl);

  const qrCodeOptions = {
    errorCorrectionLevel: 'M', // L < M < Q < H
    version: 2, // 1~40
    margin: 1,
    color: {
        dark: '#000000', // QR 코드의 색상
        light: '#FFFFFF' // 배경 색상
    },
    scale: 4 // QR 코드의 스케일
  };

  const qrCode = await QRCode.toDataURL(`https://hikorean.co.kr/${shortUrl}`, qrCodeOptions);

  if (existingShortUrl) {
      return res.render('admin/short-url', { error: '이미 등록된 짧은 URL입니다.' });
  }

  const newShortUrl = new ShortUrl({
      originalUrl,
      shortUrl,
      qrCode,
      title,
  });

  try {
      await newShortUrl.save();
      res.redirect('/admin/short-url');
  } catch (error) {
      console.error('짧은 URL 생성 오류:', error.message);
      res.status(500).send('짧은 URL 생성 중 오류가 발생했습니다.');
  }
});

// 짧은 URL 생성 페이지를 렌더링하는 API
router.get('/admin/short-url', isAdmin, async (req, res) => {
  try {
      const shortUrls = await ShortUrl.find(); // 짧은 URL 목록 조회
      res.render('admin/short-url', { shortUrls }); // 목록과 함께 렌더링
  } catch (error) {
      console.error('짧은 URL 목록 조회 오류:', error.message);
      res.status(500).send('짧은 URL 목록 조회 중 오류가 발생했습니다.');
  }
});

// 짧은 URL 목록 조회
router.get('/admin/short-url/list', isAdmin, async (req, res) => {
  try {
      const shortUrls = await ShortUrl.find();
      res.render('admin/short-url', { shortUrls });
  } catch (error) {
      console.error('짧은 URL 목록 조회 오류:', error.message);
      res.status(500).send('짧은 URL 목록 조회 중 오류가 발생했습니다.');
  }
});

// 짧은 URL 삭제
router.delete('/admin/short-url/:id', isAdmin, async (req, res) => {
  try {
      await ShortUrl.findByIdAndDelete(req.params.id);
      res.status(204).send();
  } catch (error) {
      console.error('짧은 URL 삭제 오류:', error.message);
      res.status(500).send('짧은 URL 삭제 중 오류가 발생했습니다.');
  }
});

// 짧은 URL 삭제
router.post('/admin/short-url/:id/delete', isAdmin, async (req, res) => {
  try {
      await ShortUrl.findByIdAndDelete(req.params.id);
      res.redirect('/admin/short-url'); // 삭제 후 목록 페이지로 리다이렉트
  } catch (error) {
      console.error('짧은 URL 삭제 오류:', error.message);
      res.status(500).send('짧은 URL 삭제 중 오류가 발생했습니다.');
  }
});

// 짧은 URL 수정
router.put('/admin/short-url/:id', isAdmin, async (req, res) => {
  const { title, originalUrl } = req.body;
  try {
      const updatedShortUrl = await ShortUrl.findByIdAndUpdate(req.params.id, { title, originalUrl }, { new: true });
      if (!updatedShortUrl) {
          return res.status(404).send('짧은 URL을 찾을 수 없습니다.');
      }
      res.status(204).send(); // 수정 성공
  } catch (error) {
      console.error('짧은 URL 수정 오류:', error.message);
      res.status(500).send('짧은 URL 수정 중 오류가 발생했습니다.');
  }
});

// 짧은 URL에 대한 GET 요청 처리
router.get('/:shortUrl', async (req, res) => {
  const { shortUrl } = req.params;

  // 짧은 URL이 3자리인지 확인
  if (shortUrl.length !== 3) {
      return res.status(404).send('짧은 URL을 찾을 수 없습니다.');
  }

  console.log('짧은 URL 요청:', shortUrl); // 요청된 짧은 URL을 로그에 출력

  try {
      const shortUrlEntry = await ShortUrl.findOne({ shortUrl });
      if (!shortUrlEntry) {
          console.log('짧은 URL을 찾을 수 없습니다:', shortUrl); // 추가 로그
          return res.status(404).send('짧은 URL을 찾을 수 없습니다.');
      }

      // 원래 URL로 리디렉션
      res.redirect(shortUrlEntry.originalUrl);
  } catch (error) {
      console.error('짧은 URL 처리 중 오류 발생:', error.message);
      res.status(500).send('짧은 URL 처리 중 오류가 발생했습니다.');
  }
});

module.exports = router;