// Anti-Cheating & Kiosk Student Engine - CBT Kusuma (SMAN 1 Mlati)
let currentUser = null;
let currentSession = null;
let questions = [];
let currentIndex = 0;
let studentAnswers = {};
let isExamStarted = false;
let socket = null;
let currentZoom = 100;

document.addEventListener('DOMContentLoaded', async () => {
  const userStr = localStorage.getItem('cbt_user');
  if (!userStr) {
    window.location.href = '/index.html';
    return;
  }
  currentUser = JSON.parse(userStr);

  document.getElementById('studentName').innerText = currentUser.name;
  document.getElementById('studentNis').innerText = `NIS: ${currentUser.nis || '-'}`;
  document.getElementById('studentRoomBadge').innerText = currentUser.room_name || `Ruang ${currentUser.room_id}`;

  // Start System Clock & Battery Status
  initKusumaKioskBar();

  // Connect Socket.io
  socket = io();
  socket.emit('join-room', currentUser.room_id);

  // Listen for socket unlock event
  socket.on('student-unlocked', (data) => {
    if (data.studentId == currentUser.id) {
      document.getElementById('lockedModal').classList.remove('active');
      document.getElementById('violationCount').innerText = '0';
      document.getElementById('violationBadge').className = 'badge badge-neutral';
      currentSession.status = 'IN_PROGRESS';
      currentSession.violations_count = 0;
      alert('Kunci layar Anda telah dibuka oleh Pengawas! Selamat melanjutkan ujian.');
    }
  });

  // Fetch session & questions
  await fetchSession();
  await fetchQuestions();
});

function initKusumaKioskBar() {
  // 1. Digital Clock
  setInterval(() => {
    const now = new Date();
    const clockStr = now.toLocaleTimeString('id-ID', { hour12: false });
    const clockEl = document.getElementById('kusumaClock');
    if (clockEl) clockEl.innerText = `${clockStr} WIB`;
  }, 1000);

  // 2. Battery Status API
  if (navigator.getBattery) {
    navigator.getBattery().then(battery => {
      updateBatteryUI(battery.level, battery.charging);
      battery.addEventListener('levelchange', () => updateBatteryUI(battery.level, battery.charging));
      battery.addEventListener('chargingchange', () => updateBatteryUI(battery.level, battery.charging));
    });
  }

  // 3. Online/Offline Network Status
  window.addEventListener('online', () => {
    const el = document.getElementById('netStatus');
    if (el) el.innerHTML = '<i class="fa-solid fa-wifi" style="color: #4ade80;"></i> Online';
  });
  window.addEventListener('offline', () => {
    const el = document.getElementById('netStatus');
    if (el) el.innerHTML = '<i class="fa-solid fa-plane-slash" style="color: #f87171;"></i> Terputus';
  });
}

function updateBatteryUI(level, charging) {
  const percent = Math.round(level * 100);
  const batEl = document.getElementById('batteryStatus');
  if (batEl) {
    const icon = charging ? 'fa-battery-charging' : percent > 50 ? 'fa-battery-three-quarters' : 'fa-battery-quarter';
    batEl.innerHTML = `<i class="fa-solid ${icon}" style="color: ${percent < 20 ? '#ef4444' : '#10b981'};"></i> ${percent}%`;
  }
}

function changeZoom(direction) {
  currentZoom += direction * 10;
  if (currentZoom < 80) currentZoom = 80;
  if (currentZoom > 140) currentZoom = 140;
  document.getElementById('examContainer').style.zoom = `${currentZoom}%`;
}

function quitExam() {
  if (confirm('Apakah Anda yakin ingin keluar dari sesi Ujian SMAN 1 Mlati? Sesi ujian akan diakhiri.')) {
    localStorage.clear();
    window.location.href = '/index.html';
  }
}

async function fetchSession() {
  try {
    const res = await fetch(`/api/exam/session/${currentUser.id}`);
    const data = await res.json();
    if (data.success && data.session) {
      currentSession = data.session;
      studentAnswers = JSON.parse(currentSession.answers || '{}');
      updateViolationUI(currentSession.violations_count);

      if (currentSession.status === 'LOCKED') {
        showLockedModal();
      }
    }
  } catch (err) {
    console.error('Failed to fetch session:', err);
  }
}

async function fetchQuestions() {
  try {
    const res = await fetch('/api/questions');
    const data = await res.json();
    if (data.success) {
      questions = data.questions;
      renderQuestionGrid();
    }
  } catch (err) {
    console.error('Failed to fetch questions:', err);
  }
}

function startExamWithFullscreen() {
  // Request Fullscreen
  const docEl = document.documentElement;
  if (docEl.requestFullscreen) {
    docEl.requestFullscreen().catch(err => console.log('Fullscreen rejected:', err));
  } else if (docEl.webkitRequestFullscreen) {
    docEl.webkitRequestFullscreen();
  }

  document.getElementById('preExamModal').classList.remove('active');
  document.getElementById('examContainer').style.display = 'block';
  isExamStarted = true;

  initCheatingProtection();
  renderCurrentQuestion();
}

function initCheatingProtection() {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && isExamStarted && currentSession?.status === 'IN_PROGRESS') {
      triggerViolation('TAB_SWITCH', 'Pindah tab atau berpindah ke aplikasi lain selama ujian');
    }
  });

  window.addEventListener('blur', () => {
    if (isExamStarted && currentSession?.status === 'IN_PROGRESS') {
      triggerViolation('BLUR', 'Kehilangan fokus layar ujian');
    }
  });

  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement && isExamStarted && currentSession?.status === 'IN_PROGRESS') {
      triggerViolation('FULLSCREEN_EXIT', 'Keluar dari mode layar penuh (Fullscreen)');
    }
  });

  document.addEventListener('contextmenu', (e) => e.preventDefault());
  document.addEventListener('keydown', (e) => {
    if (
      e.key === 'F12' ||
      (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
      (e.ctrlKey && (e.key === 'u' || e.key === 'U' || e.key === 'c' || e.key === 'C' || e.key === 'v' || e.key === 'V'))
    ) {
      e.preventDefault();
      triggerViolation('DEVTOOLS', 'Mencoba menggunakan shortcut keyboard dilarang');
    }
  });
}

async function triggerViolation(eventType, description) {
  if (currentSession?.status === 'LOCKED') return;

  try {
    const res = await fetch('/api/exam/violation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentId: currentUser.id,
        roomId: currentUser.room_id,
        eventType,
        description
      })
    });
    const data = await res.json();
    if (data.success) {
      currentSession.violations_count = data.violationsCount;
      updateViolationUI(data.violationsCount);

      if (data.isLocked) {
        currentSession.status = 'LOCKED';
        showLockedModal();
      } else {
        showWarningModal(description, data.violationsCount);
      }
    }
  } catch (err) {
    console.error('Failed to log violation:', err);
  }
}

function updateViolationUI(count) {
  document.getElementById('violationCount').innerText = count;
  const badge = document.getElementById('violationBadge');
  if (count === 0) badge.className = 'badge badge-neutral';
  else if (count < 3) badge.className = 'badge badge-warning';
  else badge.className = 'badge badge-danger';
}

function showWarningModal(reason, count) {
  document.getElementById('warningText').innerText = `Terdeteksi aktivitas mencurigakan: ${reason}`;
  document.getElementById('warnCount').innerText = count;
  document.getElementById('warningModal').classList.add('active');
}

function closeWarningModal() {
  document.getElementById('warningModal').classList.remove('active');
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  }
}

function showLockedModal() {
  document.getElementById('warningModal').classList.remove('active');
  document.getElementById('lockedModal').classList.add('active');
  if (document.exitFullscreen) {
    document.exitFullscreen().catch(() => {});
  }
}

async function submitUnlockCode(e) {
  e.preventDefault();
  const inputCode = document.getElementById('unlockCodeInput').value;
  const errDiv = document.getElementById('unlockError');
  errDiv.style.display = 'none';

  try {
    const res = await fetch('/api/proctor/unlock-student', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentId: currentUser.id,
        inputCode
      })
    });
    const data = await res.json();

    if (data.success) {
      document.getElementById('lockedModal').classList.remove('active');
      document.getElementById('unlockCodeInput').value = '';
      currentSession.status = 'IN_PROGRESS';
      currentSession.violations_count = 0;
      updateViolationUI(0);
      alert('Sesi berhasil dibuka! Anda dapat melanjutkan ujian.');
    } else {
      errDiv.innerText = data.message;
      errDiv.style.display = 'block';
    }
  } catch (err) {
    errDiv.innerText = 'Gagal memverifikasi kode unlock.';
    errDiv.style.display = 'block';
  }
}

function renderCurrentQuestion() {
  if (questions.length === 0) return;

  const q = questions[currentIndex];
  document.getElementById('currentQuestionNum').innerText = currentIndex + 1;
  document.getElementById('subjectName').innerText = `Mata Pelajaran: ${q.subject}`;
  document.getElementById('questionText').innerHTML = q.question_text;

  const optionsContainer = document.getElementById('optionsList');
  optionsContainer.innerHTML = '';

  const letters = ['A', 'B', 'C', 'D', 'E'];
  q.options.forEach((optText, idx) => {
    const isSelected = studentAnswers[q.id] === idx;
    const item = document.createElement('div');
    item.className = `option-item ${isSelected ? 'selected' : ''}`;
    item.onclick = () => selectOption(q.id, idx);

    item.innerHTML = `
      <div class="opt-prefix">${letters[idx]}</div>
      <div style="font-size: 0.95rem;">${optText}</div>
    `;
    optionsContainer.appendChild(item);
  });

  document.getElementById('btnPrev').disabled = currentIndex === 0;
  if (currentIndex === questions.length - 1) {
    document.getElementById('btnNext').style.display = 'none';
    document.getElementById('btnSubmit').style.display = 'inline-flex';
  } else {
    document.getElementById('btnNext').style.display = 'inline-flex';
    document.getElementById('btnSubmit').style.display = 'none';
  }

  renderQuestionGrid();
}

async function selectOption(questionId, selectedIdx) {
  studentAnswers[questionId] = selectedIdx;
  renderCurrentQuestion();

  const saveBadge = document.getElementById('saveStatus');
  saveBadge.className = 'badge badge-warning';
  saveBadge.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';

  try {
    const res = await fetch('/api/exam/answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentId: currentUser.id,
        questionId,
        selectedOption: selectedIdx
      })
    });
    const data = await res.json();
    if (data.success) {
      setTimeout(() => {
        saveBadge.className = 'badge badge-success';
        saveBadge.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Jawaban Tersimpan';
      }, 300);
    }
  } catch (err) {
    saveBadge.className = 'badge badge-danger';
    saveBadge.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Gagal Simpan';
  }
}

function navigateQuestion(direction) {
  const target = currentIndex + direction;
  if (target >= 0 && target < questions.length) {
    currentIndex = target;
    renderCurrentQuestion();
  }
}

function toggleQuestionSheet() {
  const sheet = document.getElementById('questionSheet');
  sheet.style.display = sheet.style.display === 'none' ? 'block' : 'none';
}

function renderQuestionGrid() {
  const grid = document.getElementById('questionGridButtons');
  grid.innerHTML = '';

  questions.forEach((q, idx) => {
    const btn = document.createElement('button');
    const isCurrent = idx === currentIndex;
    const isAnswered = studentAnswers[q.id] !== undefined;

    let cls = 'q-btn';
    if (isCurrent) cls += ' active';
    if (isAnswered) cls += ' answered';

    btn.className = cls;
    btn.innerText = idx + 1;
    btn.onclick = () => {
      currentIndex = idx;
      renderCurrentQuestion();
      document.getElementById('questionSheet').style.display = 'none';
    };
    grid.appendChild(btn);
  });
}

async function submitExam() {
  if (confirm('Apakah Anda yakin ingin mengumpulkan ujian? Sesi Ujian SMAN 1 Mlati akan diakhiri.')) {
    try {
      const res = await fetch('/api/exam/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: currentUser.id })
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        localStorage.clear();
        window.location.href = '/index.html';
      }
    } catch (err) {
      alert('Gagal mengumpulkan ujian.');
    }
  }
}
