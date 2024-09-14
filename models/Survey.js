const mongoose = require('mongoose');

const SurveySchema = new mongoose.Schema({
    title: { type: String, required: true },
    questions: [{
        questionText: { type: String, required: true },
        questionDescription: { type: String },
        questionType: { 
            type: String,
            enum: ['short_answer', 'long_answer', 'single_choice', 'multiple_choice', 'date', 'dropdown', 'preference', 'reservation'],
            required: true 
        },
        inputType: { 
            type: String,
            enum: ['all', 'integer', 'letters'],
            default: 'all',
            required: function () { return this.questionType === 'short_answer'; }
        },
        reservation: {
            startDate: { type: Date },
            endDate: { type: Date },
            maxParticipants: { type: Number },
            exceptionDates: [{ type: String }]
        },
        options: [{ type: String }], // 객관식 선택지
        minValue: { type: Number },
        maxValue: { type: Number },
        rankLimit: { type: Number },
        isRequired: { type: Boolean, default: false },
        allowOther: { type: Boolean, default: false },
        prefixText: { type: String }, // 입력 필드 앞에 붙일 텍스트
        suffixText: { type: String }  // 입력 필드 뒤에 붙일 텍스트
    }],  
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
});

const Survey = mongoose.model('Survey', SurveySchema);
module.exports = Survey;
