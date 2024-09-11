const mongoose = require('mongoose');

const noticeSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  originalContent: { type: String },
  translations: {
    sc: { google: [String], microsoft: [String], deepl: [String], final: [String], translatedContent: String, translatedAt: Date, finalSavedAt: Date, finalSavedBy: String },
    tc: { google: [String], microsoft: [String], deepl: [String], final: [String], translatedContent: String, translatedAt: Date, finalSavedAt: Date, finalSavedBy: String },
    jp: { google: [String], microsoft: [String], deepl: [String], final: [String], translatedContent: String, translatedAt: Date, finalSavedAt: Date, finalSavedBy: String },
    en: { google: [String], microsoft: [String], deepl: [String], final: [String], translatedContent: String, translatedAt: Date, finalSavedAt: Date, finalSavedBy: String },
    vi: { google: [String], microsoft: [String], deepl: [String], final: [String], translatedContent: String, translatedAt: Date, finalSavedAt: Date, finalSavedBy: String }
  },
  createdAt: { type: Date, default: Date.now },
  createdBy: { type: String, required: true },
  updatedAt: { type: Date },
  updatedBy: { type: String },
  shortId: { type: String, required: true, unique: true },
  readStudents: { type: [String], default: [] }
});

const Notice = mongoose.model('Notice', noticeSchema);
module.exports = Notice;
