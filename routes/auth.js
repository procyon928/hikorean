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

        // 사용자 역할에 따라 세션 또는 JWT 토큰을 생성하는 로직 추가 가능

        res.send('로그인 성공!');
    } catch (error) {
        console.error('로그인 오류:', error);
        res.status(500).send('로그인 중 오류가 발생했습니다.');
    }
});


module.exports = router;
