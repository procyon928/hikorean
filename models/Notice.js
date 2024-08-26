const mongoose = require('mongoose');

const noticeSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  translations: {
    google: { type: String, default: '' },
    microsoft: { type: String, default: '' }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});


const Notice = mongoose.model('Notice', noticeSchema);
module.exports = Notice;
