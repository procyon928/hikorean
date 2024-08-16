function isAdmin(req, res, next) {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'superadmin')) {
      return next();
  }
  return res.status(403).json({ message: '접근 권한이 없습니다.' });
}

module.exports = { isAdmin };