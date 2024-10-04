// npm run dev

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const path = require('path');
const session = require('express-session');
const ejs = require('ejs');
const authRoutes = require('./routes/auth');
const accountRoutes = require('./routes/account'); // account.js 라우터 추가
const adminRoutes = require('./routes/admin');
const emailRoutes = require('./routes/email');
const postRoutes = require('./routes/post');
const commentRoutes = require('./routes/comment');
const boardSettingRoutes = require('./routes/boardSetting');
const noticeRoutes = require('./routes/notice');
const translationRoutes = require('./routes/translation');
const { router: translateRouter } = require('./routes/translate');
const surveyRoutes = require('./routes/survey');
const shortUrlRoutes = require('./routes/shortUrl');
const admissionRoutes = require('./routes/admission');
const scheduleRoutes = require('./routes/schedule');
const homeRoutes = require('./routes/home');

const app = express();
const PORT = process.env.PORT || 8000;
require('dotenv').config();

const uri = process.env.MONGODB_URI;

mongoose.connect(uri, {})
.then(() => console.log('MongoDB 연결 성공'))
.catch((err) => console.error('MongoDB 연결 실패:', err));

// 세션 미들웨어 설정
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // HTTPS 사용 시 true로 설정
}));

// 사용자 세션 정보를 로컬 변수로 전달하는 미들웨어 추가
app.use((req, res, next) => {
    res.locals.user = req.session.user; // 사용자 세션 정보를 로컬 변수로 전달
    next();
});

// body-parser 미들웨어 설정
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// EJS 설정
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views')); // views 폴더 설정

// 정적 파일 제공
app.use(express.static(path.join(__dirname, 'public')));

// 회원가입 페이지 라우터
app.get('/signup', (req, res) => {
    res.render('signup'); // signup.ejs를 렌더링
});

// 로그인 페이지
app.get('/login', (req, res) => {
    res.render('login'); // login.ejs를 렌더링
});

// 라우터 설정
app.use(authRoutes); // auth.js 라우터를 사용
app.use(accountRoutes); // account.js 라우터를 사용 (추가됨)
app.use('/admin', adminRoutes);
app.use('/email', emailRoutes);
app.use(postRoutes);
app.use(commentRoutes);
app.use(noticeRoutes);
app.use(translationRoutes);
app.use(translateRouter);
app.use('/survey', surveyRoutes);
app.use('/', boardSettingRoutes.router);
app.use('/admission', admissionRoutes);
app.use('/admin/schedule', scheduleRoutes);
app.use('/', homeRoutes);
app.use(shortUrlRoutes); // 제일 하위에 두기

// 서버 시작
app.listen(PORT, () => {
    console.log(`서버가 http://localhost:${PORT}에서 실행 중입니다.`);
});
