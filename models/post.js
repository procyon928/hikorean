const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
    title: { type: String, required: true },
    content: { type: String, required: true },
    author: { type: mongoose.Schema.Types.ObjectId,ref: 'User', required: true }, // 사용자 모델과 연결
    createdAt: { type: Date, default: Date.now },
    category: { type: String, required: true }
});

const Post = mongoose.model('Post', postSchema);

module.exports = Post;
