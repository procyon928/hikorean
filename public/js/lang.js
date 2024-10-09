document.addEventListener('DOMContentLoaded', () => {
  const lang = document.documentElement.dataset.lang; // data-속성에서 lang 값을 가져옵니다.
  const links = document.querySelectorAll('a'); // 모든 링크를 선택합니다.

  links.forEach(link => {

    // 링크가 유효한 URL인지 확인
    if (!link.href || link.href === 'javascript:void(0);') {
      console.warn('Skipping invalid link:', link.href); // 유효하지 않은 링크는 건너뜁니다.
      return; // 다음 링크로 넘어갑니다.
    }

    let url;

    // 링크가 상대 경로인지 확인
    if (link.href.startsWith('/')) {
      // 상대 경로인 경우, 현재 도메인에 대해 절대 URL로 변환
      url = new URL(link.href, window.location.origin);
    } else {
      // 절대 경로인 경우
      url = new URL(link.href);
    }

    // 언어 쿼리를 추가합니다.
    url.searchParams.set('lang', lang); 
    link.href = url.toString(); // 수정된 URL로 링크를 업데이트합니다.
  });
});

