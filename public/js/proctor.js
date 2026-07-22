// Proctor & Operator Dashboard Controller - CBT Kusuma
let currentUser = null;
let currentRoomId = 0;
let roomsList = [];
let studentsData = [];
let socket = null;
let selectedStudentToUnlock = null;

document.addEventListener('DOMContentLoaded', async () => {
  const userStr = localStorage.getItem('cbt_user');
  if (!userStr) {
    window.location.href = '/index.html';
    return;
  }
  currentUser = JSON.parse(userStr);

  document.getElementById('proctorName').innerText = currentUser.name;
  document.getElementById('proctorRole').innerText = currentUser.role === 'operator' ? 'Operator Sekolah' : 'Guru Pengawas Ujian';

  // Connect Socket.io
  socket = io();

  // Socket Event Listeners
  socket.on('cheating-alert', (data) => {
    // Only handle if in current room or viewing all rooms
    if (currentRoomId === 0 || data.roomId == currentRoomId) {
      appendCheatingFeed(data);
      playAlertSound();
      fetchRoomStatus(); // Refresh cards
    }
  });

  socket.on('student-locked', () => fetchRoomStatus());
  socket.on('student-unlocked', () => fetchRoomStatus());
  socket.on('code-updated', (data) => {
    if (data.roomId == currentRoomId || currentRoomId === 0) {
      document.getElementById('activeCodeDisplay').innerText = data.code;
    }
  });

  await fetchRooms();

  // Default room selection based on proctor's assigned room
  if (currentUser.room_id) {
    document.getElementById('roomSelect').value = currentUser.room_id;
    currentRoomId = currentUser.room_id;
  }
  
  socket.emit('join-room', currentRoomId);
  await fetchRoomStatus();
});

async function fetchRooms() {
  try {
    const res = await fetch('/api/rooms');
    const data = await res.json();
    if (data.success) {
      roomsList = data.rooms;
      const select = document.getElementById('roomSelect');
      select.innerHTML = '<option value="0">Semua Ruangan (Operator View)</option>';
      roomsList.forEach(r => {
        select.innerHTML += `<option value="${r.id}">${r.name}</option>`;
      });
    }
  } catch (err) {
    console.error('Failed to fetch rooms:', err);
  }
}

async function changeRoomFilter() {
  const select = document.getElementById('roomSelect');
  const newRoomId = parseInt(select.value);

  if (socket && currentRoomId !== newRoomId) {
    socket.emit('leave-room', currentRoomId);
    currentRoomId = newRoomId;
    socket.emit('join-room', currentRoomId);
  }
  await fetchRoomStatus();
}

async function fetchRoomStatus() {
  try {
    const res = await fetch(`/api/proctor/room-status/${currentRoomId}`);
    const data = await res.json();

    if (data.success) {
      studentsData = data.students;
      document.getElementById('activeCodeDisplay').innerText = data.activeCode || '------';

      renderStats(studentsData);
      renderStudentGrid(studentsData);

      // Render initial logs if feed empty
      if (data.logs && data.logs.length > 0) {
        renderInitialLogs(data.logs);
      }
    }
  } catch (err) {
    console.error('Failed to fetch room status:', err);
  }
}

function renderStats(students) {
  const total = students.length;
  const active = students.filter(s => s.status === 'IN_PROGRESS').length;
  const warning = students.filter(s => s.violations_count > 0 && s.status !== 'LOCKED').length;
  const locked = students.filter(s => s.status === 'LOCKED').length;

  document.getElementById('statTotal').innerText = total;
  document.getElementById('statActive').innerText = active;
  document.getElementById('statWarning').innerText = warning;
  document.getElementById('statLocked').innerText = locked;
}

function renderStudentGrid(students) {
  const grid = document.getElementById('studentGrid');
  grid.innerHTML = '';

  if (students.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 3rem;" class="glass-card">
        Tidak ada peserta ujian di ruangan ini.
      </div>
    `;
    return;
  }

  students.forEach(s => {
    const card = document.createElement('div');
    const isLocked = s.status === 'LOCKED';
    const isWarning = s.violations_count > 0 && !isLocked;

    let cardCls = 'glass-card student-card';
    if (isLocked) cardCls += ' status-locked';
    else if (isWarning) cardCls += ' status-warning';

    let statusBadge = '';
    if (isLocked) {
      statusBadge = `<span class="badge badge-danger"><i class="fa-solid fa-lock"></i> TERKUNCI</span>`;
    } else if (s.status === 'IN_PROGRESS') {
      statusBadge = `<span class="badge badge-success"><i class="fa-solid fa-play"></i> Mengerjakan</span>`;
    } else if (s.status === 'SUBMITTED') {
      statusBadge = `<span class="badge badge-neutral"><i class="fa-solid fa-check"></i> Selesai</span>`;
    } else {
      statusBadge = `<span class="badge badge-neutral">Belum Mulai</span>`;
    }

    card.className = cardCls;
    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem;">
        <div>
          <h4 style="font-size: 1rem; font-weight: 700; margin-bottom: 0.2rem;">${s.name}</h4>
          <span style="font-size: 0.8rem; color: var(--text-muted);">NIS: ${s.nis || '-'}</span>
        </div>
        ${statusBadge}
      </div>

      <div style="display: flex; justify-content: space-between; font-size: 0.8rem; background: rgba(15, 23, 42, 0.4); padding: 0.6rem; border-radius: 8px; margin-bottom: 0.75rem;">
        <div>
          <span style="color: var(--text-muted);">Pelanggaran:</span>
          <strong style="color: ${isLocked ? '#f87171' : isWarning ? '#fbbf24' : '#34d399'};"> ${s.violations_count}/3</strong>
        </div>
        <div>
          <span style="color: var(--text-muted);">Soal:</span>
          <strong> ${s.answeredCount}/5</strong>
        </div>
      </div>

      <div style="display: flex; gap: 0.5rem;">
        ${isLocked ? `
          <button onclick="openProctorUnlockModal(${s.student_id}, '${s.name}')" class="btn btn-danger" style="width: 100%; justify-content: center; font-size: 0.8rem; padding: 0.4rem;">
            <i class="fa-solid fa-key"></i> Buka Kunci (Unlock)
          </button>
        ` : `
          <button onclick="openProctorUnlockModal(${s.student_id}, '${s.name}')" class="btn btn-outline" style="width: 100%; justify-content: center; font-size: 0.8rem; padding: 0.4rem;">
            <i class="fa-solid fa-unlock-keyhole"></i> Reset / Unlock
          </button>
        `}
      </div>
    `;
    grid.appendChild(card);
  });
}

function renderInitialLogs(logs) {
  const feed = document.getElementById('alertFeedList');
  feed.innerHTML = '';
  logs.forEach(l => {
    appendCheatingFeed({
      studentName: l.student_name,
      eventType: l.event_type,
      description: l.description,
      violationsCount: l.severity === 'CRITICAL' ? 3 : 1,
      isLocked: l.severity === 'CRITICAL',
      timestamp: new Date(l.timestamp).toLocaleTimeString('id-ID')
    });
  });
}

function appendCheatingFeed(data) {
  const feed = document.getElementById('alertFeedList');

  // Remove empty message if exists
  if (feed.children.length === 1 && feed.children[0].innerText.includes('Belum ada pelanggaran')) {
    feed.innerHTML = '';
  }

  const item = document.createElement('div');
  item.style.cssText = `
    padding: 0.75rem;
    border-radius: 10px;
    background: ${data.isLocked ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)'};
    border: 1px solid ${data.isLocked ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.3)'};
    margin-bottom: 0.75rem;
    font-size: 0.85rem;
  `;

  item.innerHTML = `
    <div style="display: flex; justify-content: space-between; font-weight: 700; margin-bottom: 0.25rem;">
      <span style="color: ${data.isLocked ? '#f87171' : '#fbbf24'};">
        <i class="fa-solid ${data.isLocked ? 'fa-lock' : 'fa-triangle-exclamation'}"></i> ${data.studentName}
      </span>
      <span style="font-size: 0.75rem; color: var(--text-muted);">${data.timestamp}</span>
    </div>
    <div style="color: var(--text-main); font-size: 0.8rem; margin-bottom: 0.25rem;">
      ${data.description}
    </div>
    <div style="font-size: 0.75rem; font-weight: 600; color: var(--text-muted);">
      Total Pelanggaran: ${data.violationsCount}/3 ${data.isLocked ? '(TERKUNCI)' : ''}
    </div>
  `;

  feed.insertBefore(item, feed.firstChild);
}

function playAlertSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(660, ctx.currentTime); // Sound alert
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch (e) {}
}

async function generateNewUnlockCode() {
  if (currentRoomId === 0) {
    alert('Pilih Ruangan khusus terlebih dahulu untuk membuat Kode Unlock Harian!');
    return;
  }

  try {
    const res = await fetch('/api/proctor/generate-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId: currentRoomId })
    });
    const data = await res.json();
    if (data.success) {
      document.getElementById('activeCodeDisplay').innerText = data.code;
      alert(`Kode Unlock 6 Digit Baru untuk Ruang ini: ${data.code}`);
    }
  } catch (err) {
    alert('Gagal menghasilkan kode unlock baru.');
  }
}

function openProctorUnlockModal(studentId, studentName) {
  selectedStudentToUnlock = studentId;
  document.getElementById('modalStudentName').innerText = `Buka Kunci Sesi: ${studentName}`;
  document.getElementById('proctorUnlockModal').classList.add('active');
}

function closeProctorUnlockModal() {
  selectedStudentToUnlock = null;
  document.getElementById('proctorUnlockModal').classList.remove('active');
}

async function confirmProctorUnlock() {
  if (!selectedStudentToUnlock) return;

  try {
    const res = await fetch('/api/proctor/unlock-student', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentId: selectedStudentToUnlock,
        inputCode: '999999' // Master code from proctor dashboard
      })
    });
    const data = await res.json();
    if (data.success) {
      closeProctorUnlockModal();
      await fetchRoomStatus();
      alert('Sesi siswa berhasil dipulihkan!');
    }
  } catch (err) {
    alert('Gagal melepaskan kunci siswa.');
  }
}

function logout() {
  if (confirm('Keluar dari dashboard pengawas?')) {
    localStorage.clear();
    window.location.href = '/index.html';
  }
}
