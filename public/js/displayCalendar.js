function displayCalendar(startDate, endDate, maxParticipants, surveyId, exceptionDates) {
  const calendarDiv = document.getElementById('calendar');
  calendarDiv.innerHTML = ''; // 기존 내용 초기화

  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = [];

  // 시작일부터 종료일까지의 날짜 배열 생성
  for (let d = start; d <= end; d.setDate(d.getDate() + 1)) {
      days.push(new Date(d));
  }

  // 7열 형식의 테이블 생성
  const table = document.createElement('table');
  const headerRow = document.createElement('tr');
  const daysOfWeek = ['월', '화', '수', '목', '금', '토', '일'];

  daysOfWeek.forEach(day => {
      const th = document.createElement('th');
      th.innerText = day;
      headerRow.appendChild(th);
  });
  table.appendChild(headerRow);

  for (let i = 0; i < days.length; i += 7) {
      const row = document.createElement('tr');
      for (let j = 0; j < 7; j++) {
          if (i + j < days.length) {
              const cell = document.createElement('td');
              const date = days[i + j];
              const dateString = new Date(date).toISOString().split('T')[0];

              // 날짜에 대한 응답 수 확인
              if (exceptionDates.includes(dateString)) {
                  cell.innerHTML = `${date.getDate()} (${date.getMonth() + 1}/${date.getFullYear()})<br>예약 불가`;
                  cell.style.backgroundColor = 'gray'; // 예약 불가 날짜 색상
                  cell.style.color = 'white';
              } else {
                  fetch(`/survey/${surveyId}/countResponses?date=${dateString}`)
                      .then(response => response.json())
                      .then(data => {
                          cell.innerHTML = `
                              <input type="radio" name="answers[0][answer]" value="${dateString}" 
                                    id="date-${dateString}" 
                                    ${data.count >= maxParticipants ? 'disabled' : ''} 
                              >
                              ${date.getDate()} (${date.getMonth() + 1}/${date.getFullYear()})<br>
                              응답 수: ${data.count}/${maxParticipants}
                          `;
                          if (data.count >= maxParticipants) {
                              cell.style.backgroundColor = 'red'; // 최대 인원 초과 시 배경색 변경
                              cell.style.color = 'white'; // 글자색 변경
                          } else {
                              cell.style.cursor = 'pointer'; // 클릭 가능하다는 표시
                          }
                      });
              }
              row.appendChild(cell);
          }
      }
      table.appendChild(row);
  }

  calendarDiv.appendChild(table);
}

console.log("displayCalendar.js가 성공적으로 로드되었습니다.");