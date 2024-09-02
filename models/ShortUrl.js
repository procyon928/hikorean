const mongoose = require('mongoose');

const shortUrlSchema = new mongoose.Schema({
  originalUrl: { type: String, required: true },
  shortUrl: { type: String, required: true, unique: true },
  qrCode: { type: String, required: true },
  title: { type: String, required: true },
}, { timestamps: true });


const ShortUrl = mongoose.model('ShortUrl', shortUrlSchema);
module.exports = ShortUrl;