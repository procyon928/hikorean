function isAdmin(req, res, next) {
  if (!req.session.user) {
      return res.status(403).json({ message: '로그인이 필요합니다.' });
  }
  if (!req.session.user.role) { // 역할이 없는 경우
      return res.status(403).json({ message: '사용자 역할이 없습니다.' });
  }
  if (req.session.user.role === 'admin' || req.session.user.role === 'superadmin') {
      return next();
  }
  return res.status(403).json({ message: '접근 권한이 없습니다.' });
}

module.exports = { isAdmin };