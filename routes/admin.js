const express = require('express');
const { User, rolesMap } = require('../models/User');
const { isAdmin } = require('../middleware/auth');

const router = express.Router();

// 회원 목록을 볼 수 있는 API
router.get('/users', isAdmin, async (req, res) => {
    try {
        const users = await User.find();
        res.json(users);
    } catch (error) {
        console.error('사용자 목록 조회 오류:', error.message); // 더 많은 정보 로그
        res.status(500).send('사용자 목록 조회 중 오류가 발생했습니다.');
    }
});

// 회원 역할을 변경할 수 있는 API
router.put('/users/:id/role', isAdmin, async (req, res) => {
    const { role } = req.body;
    const { id } = req.params;

    try {
        if (!role || !rolesMap[role]) { // 역할 유효성 검사
            return res.status(400).send('유효한 역할이 필요합니다.');
        }
        const user = await User.findByIdAndUpdate(id, { role }, { new: true });
        if (!user) {
            return res.status(404).send('사용자를 찾을 수 없습니다.');
        }
        res.json(user);
    } catch (error) {
        console.error('역할 변경 오류:', error.message);
        res.status(500).send('역할 변경 중 오류가 발생했습니다.');
    }
});

// 역할 목록을 반환하는 API 추가
router.get('/roles', isAdmin, (req, res) => {
    res.json(rolesMap);
});

module.exports = router;
