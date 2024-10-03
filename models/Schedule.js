const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema({
    title: { type: String, required: true },
    category: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: false }, // 종료 날짜는 선택적    
    description: { type: String, required: true },
    link: { type: String, required: false },
    semester: { type: Number, required: true } // 학기 정보 추가
}, { timestamps: true });

module.exports = mongoose.model('Schedule', scheduleSchema);
