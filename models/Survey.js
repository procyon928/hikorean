const mongoose = require('mongoose');

const surveySchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },
    questions: [{ 
        question: { type: String, required: true },
        options: [{ type: String, required: true }]
    }],
    createdAt: { type: Date, default: Date.now },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

module.exports = mongoose.model('Survey', surveySchema);
