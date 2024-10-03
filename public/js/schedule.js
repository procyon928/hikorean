document.addEventListener('DOMContentLoaded', () => {
  // 스케줄 삭제 이벤트
  document.querySelectorAll('.delete-schedule').forEach(button => {
      button.addEventListener('click', async (event) => {
          const id = event.target.dataset.id;
          if (confirm('정말로 삭제하시겠습니까?')) {
              await fetch(`/schedule/${id}`, {
                  method: 'DELETE'
              });
              location.reload(); // 페이지 새로고침
          }
      });
  });
});
