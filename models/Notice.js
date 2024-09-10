const mongoose = require('mongoose');

const noticeSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  originalContent: { type: String },
  translations: {
    sc: { google: [String], microsoft: [String], final: [String], translatedContent: String, translatedAt: Date, finalSavedAt: Date },
    tc: { google: [String], microsoft: [String], final: [String], translatedContent: String, translatedAt: Date, finalSavedAt: Date },
    jp: { google: [String], microsoft: [String], final: [String], translatedContent: String, translatedAt: Date, finalSavedAt: Date },
    en: { google: [String], microsoft: [String], final: [String], translatedContent: String, translatedAt: Date, finalSavedAt: Date },
    vi: { google: [String], microsoft: [String], final: [String], translatedContent: String, translatedAt: Date, finalSavedAt: Date }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date },
  shortId: { type: String, required: true, unique: true }
});

const Notice = mongoose.model('Notice', noticeSchema);
module.exports = Notice;
