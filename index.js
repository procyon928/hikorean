const express = require('express');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const User = require('./models/User');
const app = express();
const path = require('path');

// 정적 파일 제공
app.use(express.static(path.join(__dirname, 'public'))); // 'public' 폴더 내의 파일 제공

const PORT = process.env.PORT || 8000;
require('dotenv').config();

const uri = process.env.MONGODB_URI;

mongoose.connect(uri, {})
.then(() => console.log('MongoDB 연결 성공'))
.catch((err) => console.error('MongoDB 연결 실패:', err));

// body-parser 미들웨어 설정
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json()); // JSON 요청 처리

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});

// 회원가입 기능
app.post('/signup', async (req, res) => {
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

// 회원 목록을 볼 수 있는 API
app.get('/admin/users', isAdmin, async (req, res) => {
    try {
        const users = await User.find(); // 모든 사용자 조회
        res.json(users); // JSON 형태로 응답
    } catch (error) {
        console.error('사용자 목록 조회 오류:', error);
        res.status(500).send('사용자 목록 조회 중 오류가 발생했습니다.');
    }
});

// 회원 역할을 변경할 수 있는 API
app.put('/admin/users/:id/role', isAdmin, async (req, res) => {
    const { role } = req.body; // 요청 본문에서 역할 가져오기
    const { id } = req.params; // URL 파라미터에서 사용자 ID 가져오기

    try {
        const user = await User.findByIdAndUpdate(id, { role }, { new: true }); // 사용자 역할 업데이트
        if (!user) {
            return res.status(404).send('사용자를 찾을 수 없습니다.');
        }
        res.json(user); // 변경된 사용자 정보 응답
    } catch (error) {
        console.error('역할 변경 오류:', error);
        res.status(500).send('역할 변경 중 오류가 발생했습니다.');
    }
});

function isAdmin(req, res, next) {
    if (req.user.role === 'admin' || req.user.role === 'superadmin') {
        return next(); // 관리자일 경우 다음 미들웨어로 넘어감
    }
    return res.status(403).send('권한이 없습니다.'); // 권한이 없을 경우 에러 응답
}

// 메일 발송 기능
app.post('/send-email', (req, res) => {
    const { recipient, subject, message } = req.body; // 입력한 데이터 가져오기

    // nodemailer 설정
    const transporter = nodemailer.createTransport({
        host: 'smtp.daum.net', // Daum SMTP 서버
        port: 465, // SSL 포트
        secure: true, // SSL 사용
        auth: {
            user: 'hongik@hikorean.co.kr',
            pass: process.env.EMAIL_PASSWORD
        }
    });

    const mailOptions = {
        from: 'hongik@hikorean.co.kr',
        to: recipient,
        subject: subject,
        text: message
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            return res.status(500).send('메일 발송 오류: ' + error.toString());
        }
        res.send('메일이 성공적으로 발송되었습니다: ' + info.response);
    });
});

// 서버 시작
app.listen(PORT, () => {
    console.log(`서버가 http://localhost:${PORT}에서 실행 중입니다.`);
});
