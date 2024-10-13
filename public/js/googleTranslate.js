function translateTitle(originalText, lang, inputSelector) {
  // HTML 특수 문자를 원래 문자로 변환
  const decodedText = originalText
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/<br\s*\/?>/g, ' '); // <br> 태그를 공백으로 변환

  // 줄바꿈 문자를 공백으로 대체
  const textToTranslate = decodedText.replace(/\n/g, ' '); // 줄바꿈을 공백으로 대체

  fetch(`/translate?text=${encodeURIComponent(textToTranslate)}&targetLang=${lang}`)
      .then(response => response.json())
      .then(data => {
          if (data.translatedText) {
              document.querySelector(inputSelector).value = data.translatedText; // 매개변수로 전달된 선택자 사용
          } else {
              alert('번역 실패');
          }
      })
      .catch(error => {
          console.error('번역 중 오류 발생:', error);
          alert('번역 오류 발생');
      });
}
