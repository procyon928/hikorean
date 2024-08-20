const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      required: true
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    content: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    parentId: { // 답글을 위한 필드
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comment',
      default: null
    }
  });  

module.exports = mongoose.model('Comment', commentSchema);
