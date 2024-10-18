// npm run dev

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const path = require('path');
const session = require('express-session');
const MongoStore = require('connect-mongo');
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
const admissionRoutes = require('./routes/admission');
const scheduleRoutes = require('./routes/schedule');
const cafeteriaRoute = require('./routes/cafeteria');
const homeRoutes = require('./routes/home');
const shortUrlRoutes = require('./routes/shortUrl');
const passport = require('passport');
const flash = require('connect-flash');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { User } = require('./models/User');
const Notice = require('./models/Notice'); // 모델 파일 경로에 맞게 수정

const setLanguageTexts = require('./middleware/locales');

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
    store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI }),
    cookie: { secure: false } // HTTPS 사용 시 true로 설정
}));

// Passport 초기화
app.use(passport.initialize());
app.use(passport.session());

// 사용자 세션 정보를 로컬 변수로 전달하는 미들웨어 추가
app.use((req, res, next) => {
    res.locals.user = req.user; // 사용자 세션 정보를 로컬 변수로 전달
    next();
});

// 쿼리 파라미터에서 lang을 가져오고 기본값 설정
app.use((req, res, next) => {
  res.locals.lang = req.query.lang || 'ko';
  next();
});

// 언어 텍스트 설정 미들웨어 추가
app.use(setLanguageTexts);

// body-parser 미들웨어 설정
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// EJS 설정
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views')); // views 폴더 설정

// 정적 파일 제공
app.use(express.static(path.join(__dirname, 'public')));

// Passport 설정
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "/auth/google/callback",
  passReqToCallback: true
}, async (req, accessToken, refreshToken, profile, done) => {
  try {
      let user = await User.findOne({ googleId: profile.id });

      if (!user) {
          user = new User({
              username: profile.displayName,
              email: profile.emails[0].value,
              googleId: profile.id,
              authProvider: 'google',
              refreshToken: refreshToken
          });
          await user.save();
      } else {
          user.refreshToken = refreshToken;
          await user.save();
      }

      done(null, user);
  } catch (error) {
      done(error, null);
  }
}));

// 세션에 사용자 정보를 저장하는 설정
passport.serializeUser((user, done) => {
    done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
    const user = await User.findById(id);
    // console.log('세션에서 가져온 사용자:', user);
    done(null, user);
});

// Flash 미들웨어 설정
app.use(flash());

// 플래시 메시지를 EJS로 전달하기 위한 미들웨어
app.use((req, res, next) => {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  next();
});

// 모든 요청에 대해 sticky 글 확인 미들웨어
app.use(async (req, res, next) => {
  try {
    const hasStickyNotice = await Notice.findOne({ sticky: true }); // findOne 사용
    res.locals.hasStickyNotice = hasStickyNotice !== null; // 문서가 존재하면 true
  } catch (error) {
    console.error('오류:', error);
    res.locals.hasStickyNotice = false; // 오류 발생 시 기본값 설정
  }
  next(); // 다음 미들웨어 또는 라우트로 이동
});

// 회원가입 페이지 라우터
app.get('/signup', (req, res) => {
    res.render('signup'); // signup.ejs를 렌더링
});

// 로그인 페이지
app.get('/login', (req, res) => {
    res.render('login'); // login.ejs를 렌더링
});

// 라우터 설정
app.use(authRoutes);
app.use(accountRoutes);
app.use('/admin', adminRoutes);
app.use(emailRoutes);
app.use(postRoutes);
app.use(commentRoutes);
app.use(noticeRoutes);
app.use(translationRoutes);
app.use(translateRouter);
app.use(surveyRoutes);
app.use('/', boardSettingRoutes.router);
app.use('/admission', admissionRoutes);
app.use('/admin/schedule', scheduleRoutes);
app.use('/cafeteria', cafeteriaRoute)
app.use('/', homeRoutes);
app.use(shortUrlRoutes); // 제일 하위에 두기

// 서버 시작
app.listen(PORT, () => {
    console.log(`서버가 http://localhost:${PORT}에서 실행 중입니다.`);
});
