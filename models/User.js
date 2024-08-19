const mongoose = require('mongoose');

const rolesMap = {
  user: '일반 유저',
  student: '학생',
  admin: '관리자',
  superadmin: '슈퍼 관리자'
};

const roleEnum = Object.keys(rolesMap);

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: roleEnum, default: 'user' },
  createdAt: { type: Date, default: Date.now } // 가입 날짜 필드 추가
});

const User = mongoose.model('User', userSchema);

module.exports = { User, roles: roleEnum, rolesMap };
