let questionCount = 0; // 문항 개수 카운트

// 문항 HTML 구조를 반환하는 함수
function createQuestionHTML(index) {
    return `
        <div class="question">
            <button type="button" onclick="moveQuestion(this, 'up')">↑</button>
            <button type="button" onclick="moveQuestion(this, 'down')">↓</button>
            <input type="text" name="questions[${index}][questionText]" placeholder="문항 내용" required>
            <input type="text" name="questions[${index}][questionDescription]" placeholder="문항 설명">
            <label>
                <input type="checkbox" name="questions[${index}][isRequired]" value="true"> 필수
            </label>
            <select name="questions[${index}][questionType]" onchange="updateQuestionFields(this)">
                <option value="short_answer">단답형</option>
                <option value="long_answer">장문형</option>
                <option value="single_choice">단일 선택</option>
                <option value="multiple_choice">다중 선택</option>
                <option value="date">날짜 입력</option>
                <option value="dropdown">드롭다운 선택</option>
                <option value="preference">선호도</option>
                <option value="reservation">날짜 예약</option>
                <option value="time_reservation">시간 예약</option>
                <option value="info">안내문</option>
                <option value="email">이메일 검증</option>
            </select>
            <div class="options" style="display: none;">
                <div class="option">
                    <input type="text" name="questions[${index}][options][]" placeholder="선택지 입력">
                    <button type="button" onclick="removeOption(this)">삭제</button>
                </div>
                <button type="button" onclick="addOption(this)">선택지 추가</button>
            </div>
            <div class="allow-other" style="display: none;">
                <label>
                    <input type="checkbox" name="questions[${index}][allowOther]" value="true"> 기타 응답 수집
                </label>
            </div>
            <div class="textarea" style="display: none;">
                <label>답변:</label>
                <textarea name="questions[${index}][answer]" rows="4" placeholder="답변 입력"></textarea>
            </div>
            <div class="date" style="display: none;">
                <label>날짜 입력:</label>
                <input type="date" name="questions[${index}][date]" placeholder="날짜 입력">
            </div>
            <div class="short-answer" style="display: none;">
                <label>단답형 답변:</label>
                <input type="text" name="questions[${index}][prefixText]" placeholder="앞에 붙일 텍스트">
                <input type="text" name="questions[${index}][shortAnswer]" placeholder="단답형 답변 입력">
                <input type="text" name="questions[${index}][suffixText]" placeholder="뒤에 붙일 텍스트">
                <select name="questions[${index}][inputType]" onchange="updateInputType(this)">
                    <option value="all">모든 값</option>
                    <option value="letters">영문자만 입력</option>
                    <option value="integer">정수만 입력</option>
                </select>
                <div class="integer-range" style="display: none;">
                    <input type="number" name="questions[${index}][minValue]" placeholder="최소값">
                    <input type="number" name="questions[${index}][maxValue]" placeholder="최대값">
                </div>
            </div>
            <div class="rank-limit" style="display: none;">
                <label>최대 순위:</label>
                <input type="number" name="questions[${index}][rankLimit]" min="1" placeholder="최대 순위 입력">
            </div>
            <div class="reservation" style="display: none;">
                <label for="dateRange${index}">날짜 범위 선택:</label>
                <input type="text" id="dateRange${index}" placeholder="시작 날짜와 마감 날짜 선택" readonly>
                <label for="excludeDates${index}">제외할 날짜 선택:</label>
                <input type="text" id="excludeDates${index}" placeholder="제외할 날짜 선택" readonly>
                
                <label for="maxParticipants${index}">일일 최대 예약 가능 인원:</label>
                <input type="number" id="maxParticipants${index}" name="questions[${index}][reservation][maxParticipants]" min="1">
                
                <input type="hidden" name="questions[${index}][reservation][startDate]" id="startDate${index}">
                <input type="hidden" name="questions[${index}][reservation][endDate]" id="endDate${index}">
                <input type="hidden" name="questions[${index}][reservation][exceptionDates]" id="exceptionDates${index}">
            </div>
            <div class="time-reservation" style="display: none;">
                <label for="timeRange${index}">예약 가능 날짜 선택:</label>
                <input type="text" id="timeRange${index}" placeholder="예약 날짜 선택" readonly>
                
                <label for="startTime${index}">첫번째 예약 시간:</label>
                <input type="text" id="startTime${index}" placeholder="14:00">
                
                <label for="endTime${index}">마지막 예약 시간:</label>
                <input type="text" id="endTime${index}" placeholder="16:00">
                
                <label for="interval${index}">예약 시간 간격:</label>
                <select name="questions[${index}][time_reservation][interval]" id="interval${index}">
                    <option value="10">10분</option>
                    <option value="15">15분</option>
                    <option value="20">20분</option>
                    <option value="30" selected>30분</option>
                    <option value="60">60분</option>
                </select>

                <label>시간당 최대 예약 가능 인원:</label>
                <input type="number" id="maxParticipants${index}" name="questions[${index}][time_reservation][maxParticipants]" min="1">

                <input type="hidden" name="questions[${index}][time_reservation][availableDates]" id="availableDates${index}">
                <input type="hidden" name="questions[${index}][time_reservation][startTime]" id="startTimeHidden${index}">
                <input type="hidden" name="questions[${index}][time_reservation][endTime]" id="endTimeHidden${index}">
            </div>
            <div class="info" style="display: none;">
                <label>안내문:</label>
                <textarea name="questions[${index}][infoText]" rows="4" placeholder="안내문 입력"></textarea>
            </div>
            <div class="email-verification" style="display: none;">
                <label>이메일 주소:</label>
                <input type="email" name="questions[${index}][email]" placeholder="이메일 입력">
            </div>
            <button type="button" onclick="removeQuestion(this)">문항 삭제</button>
        </div>
    `;
}

// 문항 추가 함수
function addQuestion() {
    const questionsDiv = document.getElementById('questions');
    questionsDiv.insertAdjacentHTML('beforeend', createQuestionHTML(questionCount));
    const newQuestionDiv = questionsDiv.lastElementChild;
    const newQuestionSelect = newQuestionDiv.querySelector('select');
    updateQuestionFields(newQuestionSelect); // 추가된 문항의 상태 업데이트
    initializeFlatpickr(questionCount); // Flatpickr 초기화
    questionCount++;
}

function updateQuestionFields(select) {
  const questionDiv = select.closest('.question');
    const selectedValue = select.value;

    // 모든 추가 입력 필드 숨기기
    questionDiv.querySelector('.options').style.display = 'none';
    questionDiv.querySelector('.textarea').style.display = 'none';
    questionDiv.querySelector('.date').style.display = 'none';
    questionDiv.querySelector('.short-answer').style.display = 'none';
    questionDiv.querySelector('.reservation').style.display = 'none';
    questionDiv.querySelector('.time-reservation').style.display = 'none';
    questionDiv.querySelector('.info').style.display = 'none';
    questionDiv.querySelector('.email-verification').style.display = 'none';

    // 선택한 유형에 따라 필드 보이기
    const displayFields = {
        single_choice: ['options', 'allow-other'],
        multiple_choice: ['options', 'allow-other'],
        long_answer: ['textarea'],
        date: ['date'],
        short_answer: ['short-answer'],
        dropdown: ['options'],
        preference: ['options', 'rank-limit'],
        reservation: ['reservation'],
        time_reservation: ['time-reservation'],
        info: ['info'],
        email: ['email-verification']
    };

    const fieldsToShow = displayFields[selectedValue] || [];
    fieldsToShow.forEach(field => {
        questionDiv.querySelector(`.${field}`).style.display = 'block';
    });
}

function addOption(button) {
    const optionsDiv = button.parentElement;
    const questionDiv = optionsDiv.closest('.question'); // 현재 문항 div
    const questionIndex = Array.from(document.getElementById('questions').children).indexOf(questionDiv); // 질문 인덱스 추출
    const newOptionDiv = document.createElement('div');
    newOptionDiv.className = 'option';
    newOptionDiv.innerHTML = `
        <input type="text" name="questions[${questionIndex}][options][]" placeholder="선택지 입력">
        <button type="button" onclick="removeOption(this)">삭제</button>
    `;
    optionsDiv.insertBefore(newOptionDiv, button);
}

function updateInputType(select) {
    const questionDiv = select.closest('.question'); // 가장 가까운 질문 div 찾기
    const selectedValue = select.value;

    const integerRangeDiv = questionDiv.querySelector('.integer-range');

    // 모든 입력 필드 초기화
    integerRangeDiv.style.display = 'none';

    // 선택한 입력 유형에 따라 필드 보이기
    if (selectedValue === 'integer') {
        integerRangeDiv.style.display = 'block'; // 정수 범위 입력 필드 보이기
    }
}

// 날짜 및 시간 처리 함수
function initializeFlatpickr(index) {
  const dateRangeInput = document.getElementById(`dateRange${index}`);
  const excludeDatesInput = document.getElementById(`excludeDates${index}`);
  const startDateInput = document.getElementById(`startDate${index}`);
  const endDateInput = document.getElementById(`endDate${index}`);
  const exceptionDatesInput = document.getElementById(`exceptionDates${index}`);
  const timeRangeInput = document.getElementById(`timeRange${index}`);
  let excludeDates = [];

  // 선택한 날짜에 하루 추가 처리
  function addOneDay(date) {
      const newDate = new Date(date);
      newDate.setDate(newDate.getDate() + 1);
      return newDate;
  }

  // 시간값 버리고 날짜값만 처리
  function formatDate(date) {
    return date.toISOString().split('T')[0];
  }

  // [날짜 예약] 예약 가능 날짜 범위 선택 초기화 처리
  flatpickr(dateRangeInput, {
    mode: "range",
    dateFormat: "Y-m-d",
    onChange: function(selectedDates) {
        if (selectedDates.length === 2) {
            const [startDate, endDate] = selectedDates;

            startDateInput.value = formatDate(addOneDay(startDate));
            endDateInput.value = formatDate(addOneDay(endDate));

            excludeDatesInput._flatpickr.set('minDate', startDate);
            excludeDatesInput._flatpickr.set('maxDate', endDate);
        }
    }
  });

  // [날짜 예약] 예약 제외 날짜 선택 초기화 처리
  flatpickr(excludeDatesInput, {
      mode: "multiple",
      dateFormat: "Y-m-d",
      onChange: function(selectedDates) {
          excludeDates.length = 0; // 기존 배열 초기화
          selectedDates.forEach(date => {
              excludeDates.push(addOneDay(date));
          });
          exceptionDatesInput.value = excludeDates.map(formatDate).join(',');
      }
  });

  // [시간 예약] 예약 가능 날짜 선택 초기화 처리
  flatpickr(timeRangeInput, {
      mode: "multiple",
      dateFormat: "Y-m-d",
      onChange: function(selectedDates) {
          const availableDatesPlusOne = selectedDates.map(addOneDay);
          document.getElementById(`availableDates${index}`).value = availableDatesPlusOne.map(formatDate).join(',');
      }
  });

  // [시간 예약] 첫 시간, 마지막 시간 선택 초기화 처리
  function setupTimePicker(timeInputId, hiddenInputId) {
      flatpickr(document.getElementById(timeInputId), {
          enableTime: true,
          noCalendar: true,
          dateFormat: "H:i",
          time_24hr: true,
          onChange: function(selectedDates) {
              const timeValue = selectedDates[0].toISOString().split('T')[1].substring(0, 5); // 선택된 시간 가져오기
              const utcDate = new Date(`1970-01-01T${timeValue}:00Z`); // UTC로 변환
              const kstDate = new Date(utcDate.getTime() + 9 * 60 * 60 * 1000); // KST로 변환
              const kstTimeValue = kstDate.toISOString().split('T')[1].substring(0, 5); // KST 시간 형식으로 변환
              
              document.getElementById(timeInputId).value = kstTimeValue; // 시작/종료 시간 필드에 설정
              document.getElementById(hiddenInputId).value = kstTimeValue; // hidden input에 설정
          }
      });
  }

  setupTimePicker(`startTime${index}`, `startTimeHidden${index}`);
  setupTimePicker(`endTime${index}`, `endTimeHidden${index}`);
}

console.log("createQuestion.js가 성공적으로 로드되었습니다.");
