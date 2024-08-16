const express = require('express');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const User = require('./models/User'); // User 모델 추가
const app = express();
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
    res.sendFile(__dirname + '/index.html'); // index.html 파일을 응답으로 보냄
});

app.get('/signup', (req, res) => {
    res.sendFile(__dirname + '/signup.html'); // signup.html 파일을 응답으로 보냄
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
