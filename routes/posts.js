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
            author: req.session.user.id
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

// 게시글 상세보기
router.get('/:id', async (req, res) => {
    try {
        const post = await Post.findById(req.params.id).populate('author');
        if (!post) return res.status(404).send('게시글을 찾을 수 없습니다.');

        // 게시글 상세보기 페이지를 렌더링
        res.sendFile(path.join(__dirname, '../public', 'post-details.html'));
    } catch (error) {
        console.error(error);
        res.status(500).send('서버 오류');
    }
});

// 게시글 수정
router.put('/:id', ensureAuthenticated, async (req, res) => {
    const { title, content } = req.body;
    try {
        await Post.findByIdAndUpdate(req.params.id, { title, content });
        res.redirect('/posts/list');
    } catch (error) {
        console.error(error);
        res.status(500).send('서버 오류');
    }
});

// 게시글 삭제
router.delete('/:id', ensureAuthenticated, async (req, res) => {
    try {
        await Post.findByIdAndDelete(req.params.id);
        res.status(204).send();
    } catch (error) {
        console.error(error);
        res.status(500).send('서버 오류');
    }
});


module.exports = router;