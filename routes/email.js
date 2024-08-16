const express = require('express');
const nodemailer = require('nodemailer');

const router = express.Router();

// 메일 발송 기능
router.post('/send-email', (req, res) => {
    const { recipient, subject, message } = req.body;

    const transporter = nodemailer.createTransport({
        host: 'smtp.daum.net',
        port: 465,
        secure: true,
        auth: {
            user: 'hongik@hikorean.co.kr',
            pass: process.env.EMAIL_PASSWORD
        }
    });

    const mailOptions = {
        from: 'hongik@hikorean.co.kr',
        to: recipient,
        subject: subject,
        text: message
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            return res.status(500).send('메일 발송 오류: ' + error.toString());
        }
        res.send('메일이 성공적으로 발송되었습니다: ' + info.response);
    });
});

module.exports = router;
