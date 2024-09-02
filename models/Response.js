const mongoose = require('mongoose');

const responseSchema = new mongoose.Schema({
    surveyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Survey', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false }, // 선택적으로 변경
    answers: [{
        questionId: { type: String, required: true },
        answer: { type: String, required: true }
    }]
});

module.exports = mongoose.model('Response', responseSchema);
