const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const path = require('path');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const emailRoutes = require('./routes/email');
const { isAdmin } = require('./middleware/auth'); // isAdmin 미들웨어 경로에 맞게 수정

const app = express();
const PORT = process.env.PORT || 8000;
require('dotenv').config();

const uri = process.env.MONGODB_URI;

mongoose.connect(uri, {})
.then(() => console.log('MongoDB 연결 성공'))
.catch((err) => console.error('MongoDB 연결 실패:', err));

// body-parser 미들웨어 설정
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// 정적 파일 제공
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});

app.get('/admin', (req, res) => {
    const userRole = req.user.role; // 예시: 사용자 역할을 가져오는 방법
    if (userRole !== 'admin' && userRole !== 'superadmin') {
        return res.status(403).json({ message: '접근 권한이 없습니다.' });
    }
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// 라우터 설정
app.use(authRoutes);
app.use('/admin', adminRoutes);
app.use(emailRoutes);

// 서버 시작
app.listen(PORT, () => {
    console.log(`서버가 http://localhost:${PORT}에서 실행 중입니다.`);
});
