const mongoose = require('mongoose');

const SurveySchema = new mongoose.Schema({
    title: { type: Object, required: true }, // 다국어 지원을 위한 객체
    questions: [{
        questionText: { type: Object, required: true }, // 다국어 지원을 위한 객체
        questionDescription: { type: Object }, // 다국어 지원을 위한 객체
        questionType: { 
            type: String,
            enum: ['short_answer', 'long_answer', 'single_choice', 'multiple_choice', 'date', 'dropdown', 'preference', 'reservation', 'time_reservation', 'info', 'email'],
            required: true 
        },
        inputType: { 
            type: String,
            enum: ['all', 'integer', 'letters'],
            default: 'all',
            required: function () { return this.questionType === 'short_answer'; }
        },
        reservation: {
            startDate: { type: String },
            endDate: { type: String },
            maxParticipants: { type: Number },
            exceptionDates: [{ type: String }]
        },
        time_reservation: {
            availableDates: [{ type: String }],
            startTime: { type: String },
            endTime: { type: String },
            interval: { type: Number },
            maxParticipants: { type: Number }
        },
        infoText: { type: Object }, // 다국어 지원을 위한 객체
        options: [{ type: Object }], // 다국어 지원을 위한 객체 배열
        minValue: { type: Number },
        maxValue: { type: Number },
        rankLimit: { type: Number },
        isRequired: { type: Boolean, default: false },
        allowOther: { type: Boolean, default: false },
        prefixText: { type: Object }, // 다국어 지원을 위한 객체
        suffixText: { type: Object }  // 다국어 지원을 위한 객체
    }],  
    startDate: { type: Date },
    endDate: { type: Date },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
});

const Survey = mongoose.model('Survey', SurveySchema);
module.exports = Survey;
