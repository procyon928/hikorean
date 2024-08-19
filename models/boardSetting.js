const mongoose = require('mongoose');

const boardSettingSchema = new mongoose.Schema({
  category: { type: String, required: true, unique: true },
  hideAuthor: { type: Boolean, default: false },
  hideDate: { type: Boolean, default: false },
  hideComments: { type: Boolean, default: false },
  hideCommentAuthor: { type: Boolean, default: false },
  writePermission: { type: [String], default: [] },
  readPermission: { type: [String], default: [] },
  commentPermission: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

  // showThumbnail: { type: Boolean, default: false }, // 썸네일 표시 여부
  // postsPerPage: { type: Number, default: 10 }, // 페이지당 게시글 수
  // previewContent: { type: Boolean, default: false }, // 본문 내용 미리보기 여부

const BoardSetting = mongoose.model('BoardSetting', boardSettingSchema);

module.exports = BoardSetting;
