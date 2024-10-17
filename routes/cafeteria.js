const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');

const router = express.Router();

router.get('/menu', (req, res) => {
    const url = 'https://apps.hongik.ac.kr/food/food.php';

    axios.get(url)
        .then(response => {
            const $ = cheerio.load(response.data);

            // '제2기숙사 학생식당' 찾기
            const cafeteriaMenu = $('tr.subtitle').nextAll('tr').filter((index, element) => {
                const isDormitory = $(element).prev().find('td').text().includes('제2기숙사 학생식당');
                return isDormitory; // 학생식당 관련 row만 가져오기
            });

            // 아침, 점심, 저녁 메뉴 추출
            const days = {
                breakfast: {},
                lunchA: {},
                lunchB: {},
                dinner: {},
            };

            // 아침 메뉴
            const breakfastItems = cafeteriaMenu.eq(0).find('.daily-menu p').text().trim().split('\n').map(item => item.trim()).filter(item => item);
            for (const [day, items] of Object.entries(days)) {
                items.monday = breakfastItems.slice(0, 11);
                items.tuesday = breakfastItems.slice(11, 22);
                items.wednesday = breakfastItems.slice(22, 33);
                items.thursday = breakfastItems.slice(33, 44);
                items.friday = breakfastItems.slice(44, 55);
            }

            // 점심 A형 메뉴
            const lunchAItems = cafeteriaMenu.eq(1).find('.daily-menu p').text().trim().split('\n').map(item => item.trim()).filter(item => item);
            days.lunchA.monday = lunchAItems.slice(0, 8);
            days.lunchA.tuesday = lunchAItems.slice(8, 16);
            days.lunchA.wednesday = lunchAItems.slice(16, 24);
            days.lunchA.thursday = lunchAItems.slice(24, 32);
            days.lunchA.friday = lunchAItems.slice(32, 40);

            // 점심 B형 메뉴
            const lunchBItems = cafeteriaMenu.eq(2).find('.daily-menu p').text().trim().split('\n').map(item => item.trim()).filter(item => item);
            days.lunchB.monday = lunchBItems.slice(0, 8);
            days.lunchB.tuesday = lunchBItems.slice(8, 16);
            days.lunchB.wednesday = lunchBItems.slice(16, 24);
            days.lunchB.thursday = lunchBItems.slice(24, 32);
            days.lunchB.friday = lunchBItems.slice(32, 40);

            // 저녁 메뉴
            const dinnerItems = cafeteriaMenu.eq(3).find('.daily-menu p').text().trim().split('\n').map(item => item.trim()).filter(item => item);
            days.dinner.monday = dinnerItems.slice(0, 8);
            days.dinner.tuesday = dinnerItems.slice(8, 16);
            days.dinner.wednesday = dinnerItems.slice(16, 24);
            days.dinner.thursday = dinnerItems.slice(24, 32);
            days.dinner.friday = dinnerItems.slice(32, 40);
            
            // EJS 템플릿 렌더링
            res.render('items/cafeteria', { days }); // 모든 메뉴 데이터를 EJS 템플릿에 전달
        })
        .catch(error => {
            console.error('Error fetching data:', error);
            res.status(500).send('Error fetching data');
        });
});

module.exports = router;
