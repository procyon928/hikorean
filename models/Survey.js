const mongoose = require('mongoose');

const SurveySchema = new mongoose.Schema({
    title: { type: String, required: true },
    questions: [{
        questionText: { type: String, required: true },
        questionDescription: { type: String },
        questionType: { 
            type: String,
            enum: ['short_answer', 'long_answer', 'single_choice', 'multiple_choice', 'date', 'dropdown', 'preference', 'reservation', 'time_reservation'],
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
            availableDates: [{ type: String }], // 선택된 예약 날짜들
            startTime: { type: String }, // 첫 번째 예약 가능 시간
            endTime: { type: String }, // 마지막 예약 가능 시간
            interval: { type: Number }, // 예약 시간 간격
            maxParticipants: { type: Number } // 시간당 최대 예약 인원
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
