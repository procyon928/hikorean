function isAdmin(req, res, next) {
  if (!req.user) {
      return res.status(403).json({ message: '로그인이 필요합니다.' });
  }
  if (req.user.role === 'admin' || req.user.role === 'superadmin') {
      return next();
  }
  return res.status(403).json({ message: '접근 권한이 없습니다.' });
}

module.exports = { isAdmin };
