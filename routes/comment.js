const express = require('express');
const router = express.Router();
const Comment = require('../models/Comment');
const Log = require('../models/Log');
const BoardSetting = require('../models/boardSetting');
const { ensureAuthenticated } = require('../middleware/auth');
const { checkCommentAuthor, checkCommentWritePermission } = require('./boardSetting');

// 댓글 추가 처리
router.post('/posts/:id/comments', ensureAuthenticated, async (req, res) => {
    const postId = req.params.id;
    const category = req.body.category;
    
    // 해당 게시판의 설정 가져오기
    const boardSetting = await BoardSetting.findOne({ category: req.query.category });
    const user = req.user; // user 변수 정의

    // 댓글 작성 권한 확인
    if (!checkCommentWritePermission(boardSetting, user)) {
        return res.status(403).send("<script>alert('댓글 작성 권한이 없습니다.'); window.location.href='/';</script>");
    }

    const comment = new Comment({
        post: postId,
        author: req.user._id,
        content: req.body.content,
        parentId: req.body.parentId || null
    });

    try {
      await comment.save();

      // 댓글 작성 로그 추가
      const logEntry = new Log({
          action: 'comment_added',
          user: user.username,
          details: `댓글이 추가되었습니다: ${req.body.content}`,
          timestamp: new Date()
      });
      await logEntry.save();

      res.redirect(`/posts/${postId}?category=${req.query.category}`);
  } catch (error) {
      console.error(error);
      res.status(500).send('Error saving comment');
  }
});

// 댓글 삭제 처리
router.post('/posts/:postId/comments/:commentId/delete', ensureAuthenticated, async (req, res) => {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) {
        return res.status(404).send('Comment not found');
    }

    if (!checkCommentAuthor(comment, req.user)) {
        return res.status(403).send("<script>alert('접근 권한이 없습니다.'); window.location.href='/';</script>");
    }

    try {
        await Comment.deleteOne({ _id: req.params.commentId });
        res.redirect(`/posts/${req.params.postId}?category=${req.query.category}`);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error deleting comment');
    } 
});

// 댓글 수정 처리
router.post('/posts/:postId/comments/:commentId/edit', ensureAuthenticated, async (req, res) => {
  const comment = await Comment.findById(req.params.commentId);
  if (!comment) {
      return res.status(404).send('Comment not found');
  }

  const user = req.user; // user 변수 정의

  if (!checkCommentAuthor(comment, user)) {
      return res.status(403).send("<script>alert('접근 권한이 없습니다.'); window.location.href='/';</script>");
  }

  comment.content = req.body.content;

  try {
      await comment.save();

      // 댓글 작성 로그 추가
      const logEntry = new Log({
          action: 'comment_updated', // 수정된 액션 이름
          user: user.username, // 또는 user.id
          details: `댓글이 수정되었습니다: ${req.body.content}`,
          timestamp: new Date() // 타임스탬프 추가
      });
      await logEntry.save();

      res.redirect(`/posts/${req.params.postId}?category=${req.query.category}`);
  } catch (error) {
      console.error(error);
      res.status(500).send('Error saving comment');
  }
});


module.exports = router;