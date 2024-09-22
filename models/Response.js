const mongoose = require('mongoose');

const ResponseSchema = new mongoose.Schema({
    surveyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Survey', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
    answers: [{ questionId: mongoose.Schema.Types.ObjectId, answer: mongoose.Schema.Types.Mixed, otherAnswer: { type: String } }],
    submittedAt: { type: Date, default: Date.now },
    startedAt: { type: Date }
});

const Response = mongoose.model('Response', ResponseSchema);
module.exports = Response;
