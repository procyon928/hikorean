function isAdmin(req, res, next) {
  if (!req.user) {
      return res.redirect('/login'); // 로그인하지 않은 경우 로그인 페이지로 리다이렉트
  }
  if (!req.user.role) { // 역할이 없는 경우
      return res.redirect('/login'); // 역할이 없는 경우도 로그인 페이지로 리다이렉트
  }
  if (req.user.role === 'admin' || req.user.role === 'superadmin') {
      return next();
  }
  return res.status(403).json({ message: '접근 권한이 없습니다.' });
}

function ensureAuthenticated(req, res, next) {
  if (req.user) { // 세션에 사용자 정보가 있는지 확인
      return next();
  }
  res.redirect('/login'); // 로그인 페이지로 리다이렉트
}

module.exports = { ensureAuthenticated, isAdmin };
