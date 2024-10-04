const express = require('express');
const { User } = require('../models/User'); // User 모델 가져오기
const bcrypt = require('bcrypt');
const router = express.Router();

// 회원 페이지
router.get('/account', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login'); // 로그인하지 않은 경우 로그인 페이지로 리다이렉트
    }
    res.render('account', { user: req.session.user }); // 사용자 정보를 전달
});

// 회원 정보 수정
router.post('/account/update', async (req, res) => {
    const { username, email } = req.body;
    try {
        await User.updateOne({ _id: req.session.user.id }, { username, email });
        req.session.user.username = username; // 세션 정보 업데이트
        req.session.user.email = email;
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
        const user = await User.findById(req.session.user.id);
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

module.exports = router;
