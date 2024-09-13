// const mongoose = require('mongoose');

// const surveySchema = new mongoose.Schema({
//   title: { type: String, required: true },
//   description: { type: String },
//   questions: [{ 
//       question: { type: String, required: true },
//       options: [{ type: String, required: true }],
//       type: { type: String, enum: ['short-answer', 'long-answer', 'single-choice', 'multiple-choice', 'date'], required: true }
//   }],
//   createdAt: { type: Date, default: Date.now },
//   createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
// });


// module.exports = mongoose.model('Survey', surveySchema);


const mongoose = require('mongoose');

const SurveySchema = new mongoose.Schema({
    title: { type: String, required: true },
    questions: [{
        questionText: { type: String, required: true },
        questionType: { 
            type: String,
            enum: ['short_answer', 'long_answer', 'single_choice', 'multiple_choice', 'date'],
            required: true 
        },
        options: [{ type: String }] // 객관식의 경우 선택지
    }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
});

const Survey = mongoose.model('Survey', SurveySchema);
module.exports = Survey;
