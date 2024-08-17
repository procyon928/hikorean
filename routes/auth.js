const express = require('express');
const User = require('../models/User');

const router = express.Router();

// 회원가입 기능
router.post('/signup', async (req, res) => {
    const { username, email, password } = req.body;

    try {
        const newUser = new User({ username, email, password });
        await newUser.save();
        res.send('회원가입 성공!');
    } catch (error) {
        console.error('회원가입 오류:', error);
        res.status(500).send('회원가입 중 오류가 발생했습니다.');
    }
});

// 로그인 기능
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const user = await User.findOne({ username });

        // 사용자 존재 여부 및 비밀번호 확인
        if (!user || user.password !== password) {
            return res.status(401).send('아이디 또는 비밀번호가 잘못되었습니다.');
        }

        // 사용자 정보를 세션에 저장
        req.session.user = {
            id: user._id,
            role: user.role
        };

        // 세션 로그 추가
        console.log('로그인 후 세션:', req.session);

        res.send('로그인 성공!');
    } catch (error) {
        console.error('로그인 오류:', error);
        res.status(500).send('로그인 중 오류가 발생했습니다.');
    }
});

module.exports = router;
