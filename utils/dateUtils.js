// /utils/dateUtils.js
const moment = require('moment-timezone');

// 날짜 변환 유틸리티 함수
const convertToKST = (utcDate, format) => {
    return moment(utcDate).tz('Asia/Seoul').format(format);
};

module.exports = { convertToKST };
