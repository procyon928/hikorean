const fs = require('fs');
const path = require('path');

// locales.json 파일 경로
const localesPath = path.join(__dirname, '../data/locales.json');
const locales = JSON.parse(fs.readFileSync(localesPath, 'utf8'));

// 언어 인덱스 매핑
const languageIndex = {
    ko: 0,
    sc: 1,
    tc: 2,
    jp: 3,
    en: 4,
    vi: 5
};

// 미들웨어
function setLanguageTexts(req, res, next) {
    const lang = req.query.lang || 'ko'; // 기본값 한국어

    // 특정 페이지의 텍스트를 가져오기
    const page = req.path.split('/')[1] || 'home'; // URL 경로에서 페이지 이름 추출 (예: /home -> home)

    // 페이지에 해당하는 텍스트 가져오기
    const texts = locales[page] || locales.home; // 기본값으로 home 페이지 텍스트 설정

    // 언어에 맞게 텍스트 가져오기
    const localizedTexts = {
        common: {}, // common 속성 초기화
        [page]: {} // home 속성 초기화
    };

    // common 텍스트 설정
    for (const key in locales.common) {
        localizedTexts.common[key] = {
            ko: locales.common[key][languageIndex.ko],
            sc: locales.common[key][languageIndex.sc],
            tc: locales.common[key][languageIndex.tc],
            jp: locales.common[key][languageIndex.jp],
            en: locales.common[key][languageIndex.en],
            vi: locales.common[key][languageIndex.vi]
        };
    }

    // 각 페이지에 대한 텍스트 설정
    for (const key in texts) {
        localizedTexts[page][key] = {
            ko: texts[key][languageIndex.ko],
            sc: texts[key][languageIndex.sc],
            tc: texts[key][languageIndex.tc],
            jp: texts[key][languageIndex.jp],
            en: texts[key][languageIndex.en],
            vi: texts[key][languageIndex.vi]
        };
    }

    // localizedTexts 객체를 응답 객체에 추가
    res.locals.texts = localizedTexts;

    next(); // 다음 미들웨어 또는 라우터로 넘어감
}

module.exports = setLanguageTexts; // 미들웨어를 내보냄
