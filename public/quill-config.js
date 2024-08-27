// public/quill-config.js
function initializeQuill(editorId, content = '') {
  const quill = new Quill(editorId, {
      theme: 'snow',
      modules: {
          toolbar: [
              [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
              ['bold', 'italic', 'underline', 'strike'],
              // ['blockquote', 'code-block'],
              ['link', 'image', 'video',], // 'formula', 이미지는 저장 기능 구현 필요
              [{ 'header': 1 }, { 'header': 2 }],
              [{ 'list': 'ordered' }, { 'list': 'bullet' }, { 'list': 'check' }],
              [{ 'script': 'sub'}, { 'script': 'super' }],
              [{ 'indent': '-1'}, { 'indent': '+1' }],
              // [{ 'direction': 'rtl' }],

              // [{ 'size': ['small', false, 'large', 'huge'] }],
              [{ 'color': [] }, { 'background': [] }],
              // [{ 'font': [] }],
              [{ 'align': [] }],

              ['clean']
          ]
      }
  });

  // 기존 내용이 있다면 에디터에 설정
  if (content) {
      quill.root.innerHTML = content;
  }

  return quill;
}
