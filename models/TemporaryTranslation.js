const mongoose = require('mongoose');

const temporaryTranslationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' }, // 사용자 ID
  noticeId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Notice' }, // 게시글 ID
  language: { type: String, required: true }, // 언어 코드
  translations: [String] // 번역 내용
}, {
  timestamps: true // createdAt, updatedAt 자동 생성
});

const TemporaryTranslation = mongoose.model('TemporaryTranslation', temporaryTranslationSchema);
module.exports = TemporaryTranslation;
