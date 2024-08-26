const mongoose = require('mongoose');

// 로그 스키마 정의
const logSchema = new mongoose.Schema({
    action: { type: String, required: true }, // 어떤 행동인지 (예: 'login', 'post_created', 'email_sent')
    user: { type: String, required: true },   // 로그를 남긴 사용자
    timestamp: { type: Date, default: Date.now }, // 로그가 기록된 시간
    details: { type: String }, // 추가적인 정보 (예: 이메일의 info.response)
});

// 모델 생성
const Log = mongoose.model('Log', logSchema);

module.exports = Log;
