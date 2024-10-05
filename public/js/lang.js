document.addEventListener('DOMContentLoaded', () => {
  const lang = document.documentElement.dataset.lang; // data-속성에서 lang 값을 가져옵니다.
  const links = document.querySelectorAll('a'); // 모든 링크를 선택합니다.

  links.forEach(link => {
      const url = new URL(link.href);
      url.searchParams.set('lang', lang); // 언어 쿼리를 추가합니다.
      console.log('Updated URL:', url.toString()); // 수정된 URL 확인
      link.href = url.toString(); // 수정된 URL로 링크를 업데이트합니다.
  });
});
