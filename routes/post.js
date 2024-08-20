const express = require('express');
const router = express.Router();
const Post = require('../models/post');
const Comment = require('../models/Comment');
const { ensureAuthenticated } = require('../middleware/auth');
const BoardSetting = require('../models/boardSetting');
const { allowedCategories, validateCategory, checkAuthor, checkWritePermission, checkReadPermission, checkCommentWritePermission  } = require('./boardSetting');

// 게시글 목록 페이지
router.get('/posts', async (req, res) => {
  const user = req.session.user; // 로그인한 사용자 정보
  const category = req.query.category;

  // admin 또는 superadmin인 경우 카테고리 검증 생략
  if (user && (user.role === 'admin' || user.role === 'superadmin')) {
    // 카테고리 검증 생략
  } else if (user && !validateCategory(category)) {
    return res.status(400).send("<script>alert('유효하지 않은 카테고리입니다.'); window.location.href='/';</script>");
  }

  const boardSetting = await BoardSetting.findOne({ category });
  
  // 게시판 설정에 따른 쓰기 권한 확인
  const canWrite = checkWritePermission(boardSetting, user);

  let posts;
  if (category) {
    posts = await Post.find({ category }).populate('author', 'username');
  } else {
    posts = await Post.find().populate('author', 'username');
  }

  // 각 게시글에 대해 댓글 수를 계산
  for (const post of posts) {
    post.commentCount = await Comment.countDocuments({ post: post._id });
  }

  return res.render('posts/list', { posts, user, category, allowedCategories, boardSetting, canWrite });
});

// 게시글 작성 페이지
router.get('/posts/new', ensureAuthenticated, (req, res) => {
 const category = req.query.category;
 res.render('posts/new', { category });
});

// 게시글 작성 처리
router.post('/posts', ensureAuthenticated, async (req, res) => {
  const category = req.body.category;
  const user = req.session.user;

  const boardSetting = await BoardSetting.findOne({ category });

  // 카테고리에 대한 작성 권한 확인
  if (!checkWritePermission(boardSetting, user)) {
      return res.status(403).send("<script>alert('게시글 작성 권한이 없습니다.'); window.location.href='/';</script>");
  }

  const newPost = new Post({
      title: req.body.title,
      content: req.body.content,
      author: user.id,
      category: category
  });

  try {
      await newPost.save();
      res.redirect(`/posts?category=${category}`);
  } catch (error) {
      console.error(error);
      res.status(500).send('Error saving post');
  }
});

// 게시글 상세 페이지
router.get('/posts/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate('author', 'username');
    if (!post) {
      return res.status(404).send('Post not found');
    }

    const category = req.query.category;
    const boardSetting = await BoardSetting.findOne({ category });
    const user = req.session.user;

    // 읽기 권한 체크
    if (!checkReadPermission(boardSetting, user)) {
      return res.status(403).send("<script>alert('게시글 확인 권한이 없습니다.'); window.location.href='/';</script>");
    }

    // 댓글 작성 권한 체크
    const commentPermission = checkCommentWritePermission(boardSetting, user);

    const comments = await Comment.find({ post: post._id }).populate('author', 'username');
    
    const filteredComments = comments.map(comment => ({
      ...comment._doc,
      author: (boardSetting && !boardSetting.hideCommentAuthor) ? comment.author : null
    }));

    res.render('posts/detail', { post, user, category, boardSetting, commentPermission, comments: filteredComments });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

// 조회수 증가 API
router.post('/posts/:id/incrementViews', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).send('Post not found');
    }

    // 조회수 증가
    post.views += 1;
    await post.save();

    res.status(200).send('Views incremented');
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

// 게시글 수정 페이지 및 처리
router.route('/posts/edit/:id')
  .get(ensureAuthenticated, async (req, res) => {
    const post = await Post.findById(req.params.id);
    if (!post || !checkAuthor(post, req.session.user)) {
      return res.status(403).json({ message: '접근 권한이 없습니다.' });
    }
    const category = req.query.category;
    res.render('posts/edit', { post, category });
  })
  .post(ensureAuthenticated, async (req, res) => {
    const post = await Post.findById(req.params.id);
    if (!post || !checkAuthor(post, req.session.user)) {
      return res.status(403).json({ message: '접근 권한이 없습니다.' });
    }
    await Post.findByIdAndUpdate(req.params.id, {
      title: req.body.title,
      content: req.body.content
    });
    const category = req.query.category;
    res.redirect(`/posts?category=${category}`);
  });

// 게시글 삭제 처리
router.post('/posts/delete/:id', ensureAuthenticated, async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post || !checkAuthor(post, req.session.user)) {
    return res.status(403).json({ message: '접근 권한이 없습니다.' });
  }

  await Post.findByIdAndDelete(req.params.id);
  const category = req.query.category;
  res.redirect(`/posts?category=${category}`);
});

module.exports = router;
