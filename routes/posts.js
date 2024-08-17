const express = require('express');
const router = express.Router();
const Post = require('../models/post');
const path = require('path');
const { ensureAuthenticated } = require('../middleware/auth');

// 게시글 작성 페이지
router.get('/new', ensureAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'new-post.html'));
});

// 게시글 저장
router.post('/', ensureAuthenticated, async (req, res) => {
    const { title, content } = req.body;

    try {
        const newPost = new Post({
            title,
            content,
            author: req.user.id
        });
        await newPost.save();
        res.redirect('/posts/list'); // 게시글 목록으로 리다이렉트
    } catch (error) {
        console.error(error);
        res.status(500).send('서버 오류');
    }
});

// 게시글 목록
router.get('/', async (req, res) => {
    try {
        const posts = await Post.find().populate('author').sort({ createdAt: -1 });
        res.json(posts);
    } catch (error) {
        console.error(error);
        res.status(500).send('서버 오류');
    }
});

// 게시글 목록 페이지
router.get('/list', async (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'posts.html'));
});

module.exports = router;