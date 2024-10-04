// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcrypt'); // bcrypt를 사용하여 비밀번호 해싱

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
  createdAt: { type: Date, default: Date.now }
});

// 비밀번호 확인 메서드 추가
userSchema.methods.verifyPassword = async function(password) {
    return await bcrypt.compare(password, this.password); // bcrypt를 사용하여 비밀번호 비교
};

const User = mongoose.model('User', userSchema);

module.exports = { User, roles: roleEnum, rolesMap };
