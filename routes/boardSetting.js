const express = require('express');
const router = express.Router();
const BoardSetting = require('../models/boardSetting');
const { ensureAuthenticated, isAdmin } = require('../middleware/auth');
const { roles, rolesMap } = require('../models/User');

const allowedCategories = {
    general: '일반',
    secondhand: '거래',
    culture: '문화',
    question: '한국어 질문'
};

// 카테고리 검증 함수
const validateCategory = (category) => {
    return category && Object.keys(allowedCategories).includes(category);
};

// 작성자 확인 함수
const checkAuthor = (post, user) => {
    return post.author.toString() === user.id || user.role === 'admin' || user.role === 'superadmin';
};

// 댓글 작성자 확인 함수
const checkCommentAuthor = (comment, user) => {
    return comment.author.toString() === user.id || user.role === 'admin' || user.role === 'superadmin';
};

// 공통 역할 확인 함수
const hasPermission = (userRole, permissionRoles) => {
    const allRoles = ['guest', ...roles];
    const userRoleIndex = allRoles.indexOf(userRole);
    return permissionRoles.some(role => userRoleIndex >= allRoles.indexOf(role));
};

// 쓰기 권한 확인 함수
const checkWritePermission = (boardSetting, user) => {
    if (!boardSetting || !user || !user.role) return false;
    return hasPermission(user.role, boardSetting.writePermission);
};

// 읽기 권한 확인 함수
const checkReadPermission = (boardSetting, user) => {
    if (!boardSetting) return false;
    if (boardSetting.readPermission.includes('guest')) return true; // 비회원도 접근 가능
    if (!user || !user.role) return false;
    return hasPermission(user.role, boardSetting.readPermission);
};

// 댓글 작성 권한 확인 함수
const checkCommentWritePermission = (boardSetting, user) => {
    if (!boardSetting || !user || !user.role) return false;
    return hasPermission(user.role, boardSetting.commentPermission);
};

// 설정 페이지 (모든 카테고리)
router.get('/settings', ensureAuthenticated, async (req, res) => {
    const settings = await BoardSetting.find();
    res.render('settings', { settings });
});

// 카테고리별 게시판 설정 페이지
router.get('/posts/settings/:category', ensureAuthenticated, async (req, res) => {
    const category = req.params.category;

    if (!validateCategory(category)) {
        return res.status(404).send('페이지를 찾을 수 없습니다.');
    }

    const boardSetting = await BoardSetting.findOne({ category });
    if (!boardSetting) {
        return res.status(404).send('게시판 설정을 찾을 수 없습니다.');
    }

    const canWrite = checkWritePermission(boardSetting, req.session.user);
    const commentPermission = checkCommentWritePermission(boardSetting, req.session.user);
   
    res.render('posts/settings', { user: req.session.user, category, boardSetting, allowedCategories, canWrite, commentPermission, roles, rolesMap });
});

// 설정 수정 (모든 카테고리)
router.post('/settings/update', ensureAuthenticated, isAdmin, async (req, res) => {
    const { category, hideAuthor, hideDate, hideComments, hideCommentAuthor, hideViews, hideCommentCount, writePermission, readPermission, commentPermission } = req.body;

    const settingsToUpdate = {
        hideAuthor: hideAuthor === 'on',
        hideDate: hideDate === 'on',
        hideComments: hideComments === 'on',
        hideCommentAuthor: hideCommentAuthor === 'on',
        hideViews: hideViews === 'on', // 추가
        hideCommentCount: hideCommentCount === 'on', // 추가
        writePermission: writePermission || [],
        readPermission: readPermission || [],
        commentPermission: commentPermission || []
    };

    await BoardSetting.findOneAndUpdate(
        { category },
        settingsToUpdate,
        { new: true, upsert: true }
    );

    res.redirect('/settings');
});

// 설정 저장 처리 (카테고리별)
router.post('/posts/settings/:category', ensureAuthenticated, async (req, res) => {
    const category = req.params.category;
    const hideAuthor = req.body.hideAuthor === 'on';
    const hideDate = req.body.hideDate === 'on'; 
    const hideComments = req.body.hideComments === 'on'; 
    const hideCommentAuthor = req.body.hideCommentAuthor === 'on'; 
    const hideViews = req.body.hideViews === 'on';
    const hideCommentCount = req.body.hideCommentCount === 'on';

    const writePermission = req.body.writePermission || [];
    const readPermission = req.body.readPermission || [];
    const commentPermission = req.body.commentPermission || [];

    await BoardSetting.findOneAndUpdate(
        { category },
        { hideAuthor, hideDate, hideComments, hideCommentAuthor, hideViews, hideCommentCount, writePermission, readPermission, commentPermission },
        { upsert: true }
    );

    res.redirect(`/posts?category=${category}`);
});

module.exports = {
    router,
    allowedCategories,
    validateCategory,
    checkAuthor,
    checkCommentAuthor,
    checkWritePermission,
    checkReadPermission,
    checkCommentWritePermission,
};
