// npm run dev

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const path = require('path');
const session = require('express-session');
const ejs = require('ejs');
const authRoutes = require('./routes/auth');
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
const { ensureAuthenticated, isAdmin } = require('./middleware/auth');

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

// body-parser 미들웨어 설정
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// EJS 설정
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views')); // views 폴더 설정

// 정적 파일 제공
app.use(express.static(path.join(__dirname, 'public')));

// 홈 페이지
app.get('/', (req, res) => {
    res.render('index');
});

// 회원가입 페이지
app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});

// 로그인 페이지
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// 관리자 페이지
app.get('/admin', (req, res) => {
    // 세션 로그 추가
    console.log('세션:', req.session);
   
    // 세션에서 사용자 역할을 가져옴
    if (!req.session.user) {
    return res.status(403).json({ message: '로그인이 필요합니다.' });
    }
   
    const userRole = req.session.user.role;
    console.log('사용자 역할:', userRole);
   
    if (userRole !== 'admin' && userRole !== 'superadmin') {
    return res.status(403).json({ message: '접근 권한이 없습니다.' });
    }
    res.render('admin'); // admin.ejs를 렌더링
   });

// 라우터 설정
app.use(authRoutes); // 제일 상위에 두기
app.use('/admin', adminRoutes);
app.use('/email', emailRoutes);
app.use(postRoutes);
app.use(commentRoutes);
app.use(noticeRoutes);
app.use(translationRoutes);
app.use(translateRouter);
app.use('/survey', surveyRoutes);
app.use('/', boardSettingRoutes.router);
app.use(shortUrlRoutes); // 제일 하위에 두기

// 서버 시작
app.listen(PORT, () => {
    console.log(`서버가 http://localhost:${PORT}에서 실행 중입니다.`);
});
