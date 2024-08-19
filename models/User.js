const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'student', 'admin', 'superadmin'], default: 'user' } // 기본값은 'user'
});

const User = mongoose.model('User', userSchema);

module.exports = User;
