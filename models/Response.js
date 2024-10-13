const mongoose = require('mongoose');

const ResponseSchema = new mongoose.Schema({
    surveyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Survey', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false }, // ObjectId로 변경
    answers: [{ questionId: mongoose.Schema.Types.ObjectId, answer: mongoose.Schema.Types.Mixed, otherAnswer: { type: String } }],
    submittedAt: { type: Date, default: Date.now }, // 제출 시간 추가
    startedAt: { type: Date }, // 시작 시간 추가
    lang: { type: String } // 언어 추가
});

const Response = mongoose.model('Response', ResponseSchema);
module.exports = Response;
