// Proctor & Operator Dashboard Controller - CBT Kusuma (SMAN 1 Mlati)
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
    if (currentRoomId === 0 || data.roomId == currentRoomId) {
      appendCheatingFeed(data);
      playAlertSound();
      fetchRoomStatus();
    }
  });

  socket.on('student-locked', () => fetchRoomStatus());
  socket.on('student-unlocked', () => fetchRoomStatus());
  socket.on('code-updated', (data) => {
    if (data.roomId == currentRoomId || currentRoomId === 0) {
      document.getElementById('activeCodeDisplay').innerText = data.code;
    }
  });

  socket.on('battery-update', (data) => {
    const student = studentsData.find(s => s.student_id == data.studentId);
    if (student) {
      student.battery_level = data.batteryLevel;
      student.is_charging = data.isCharging ? 1 : 0;
      renderStudentGrid(studentsData);

      if (data.batteryLevel <= 15 && !data.isCharging) {
        appendCheatingFeed({
          studentName: student.name,
          eventType: 'LOW_BATTERY',
          description: `⚠️ Baterai HP/Tablet Siswa Lemah (${data.batteryLevel}%). Perlu Charger Segera!`,
          violationsCount: student.violations_count,
          isLocked: false,
          timestamp: new Date().toLocaleTimeString('id-ID')
        });
      }
    }
  });

  await fetchRooms();

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
      <div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 3rem;" class="card-ui">
        <i class="fa-solid fa-users-slash" style="font-size: 2.5rem; margin-bottom: 0.5rem; color: #cbd5e1; display: block;"></i>
        Tidak ada peserta ujian terdaftar di ruangan ini.
      </div>
    `;
    return;
  }

  students.forEach(s => {
    const card = document.createElement('div');
    const isLocked = s.status === 'LOCKED';
    const isWarning = s.violations_count > 0 && !isLocked;

    let cardCls = 'student-card';
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

    let batteryBadge = '';
    if (s.battery_level !== undefined && s.battery_level !== null) {
      const batPct = s.battery_level;
      const isChar = s.is_charging == 1;
      if (isChar) {
        batteryBadge = `<span class="badge badge-success" style="font-size:0.7rem; padding:0.2rem 0.5rem;"><i class="fa-solid fa-bolt"></i> ⚡ ${batPct}%</span>`;
      } else if (batPct <= 15) {
        batteryBadge = `<span class="badge badge-danger" style="font-size:0.7rem; padding:0.2rem 0.5rem;"><i class="fa-solid fa-battery-quarter fa-bounce"></i> 🪫 ${batPct}% (Lemah!)</span>`;
      } else if (batPct <= 35) {
        batteryBadge = `<span class="badge badge-warning" style="font-size:0.7rem; padding:0.2rem 0.5rem;"><i class="fa-solid fa-battery-half"></i> 🔋 ${batPct}%</span>`;
      } else {
        batteryBadge = `<span class="badge badge-success" style="font-size:0.7rem; padding:0.2rem 0.5rem;"><i class="fa-solid fa-battery-full"></i> 🔋 ${batPct}%</span>`;
      }
    }

    card.className = cardCls;
    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.85rem;">
        <div style="display: flex; align-items: center; gap: 0.65rem;">
          <div style="width: 36px; height: 36px; border-radius: 50%; background: #eff6ff; color: #2563eb; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.9rem; border: 1px solid #bfdbfe;">
            <i class="fa-solid fa-user-graduate"></i>
          </div>
          <div>
            <h4 style="font-size: 0.95rem; font-weight: 800; color: #0f172a; margin-bottom: 0.1rem;">${s.name}</h4>
            <div style="display:flex; align-items:center; gap:0.4rem; font-size: 0.75rem; color: #64748b; font-weight: 600;">
              <span>NIS: ${s.nis || '-'}</span>
              ${batteryBadge}
            </div>
          </div>
        </div>
        ${statusBadge}
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; font-size: 0.8rem; background: #f8fafc; padding: 0.6rem 0.75rem; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 0.85rem;">
        <div>
          <span style="color: #64748b; font-weight: 600;">Pelanggaran:</span>
          <strong style="color: ${isLocked ? '#dc2626' : isWarning ? '#d97706' : '#16a34a'};"> ${s.violations_count}/3</strong>
        </div>
        <div style="text-align: right;">
          <span style="color: #64748b; font-weight: 600;">Dijawab:</span>
          <strong style="color: #2563eb;"> ${s.answeredCount}/5</strong>
        </div>
      </div>

      <div style="display: flex; gap: 0.5rem;">
        ${isLocked ? `
          <button onclick="openProctorUnlockModal(${s.student_id}, '${s.name}')" class="btn btn-danger" style="width: 100%; justify-content: center; font-size: 0.8rem; padding: 0.45rem;">
            <i class="fa-solid fa-key"></i> Buka Kunci (Unlock)
          </button>
        ` : `
          <button onclick="openProctorUnlockModal(${s.student_id}, '${s.name}')" class="btn btn-outline" style="width: 100%; justify-content: center; font-size: 0.8rem; padding: 0.45rem;">
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

  if (feed.children.length === 1 && feed.children[0].innerText.includes('Belum ada pelanggaran')) {
    feed.innerHTML = '';
  }

  const item = document.createElement('div');
  item.style.cssText = `
    padding: 0.75rem 0.85rem;
    border-radius: 8px;
    background: ${data.isLocked ? '#fef2f2' : '#fef3c7'};
    border: 1px solid ${data.isLocked ? '#fecaca' : '#fde68a'};
    margin-bottom: 0.6rem;
    font-size: 0.825rem;
  `;

  item.innerHTML = `
    <div style="display: flex; justify-content: space-between; font-weight: 800; margin-bottom: 0.2rem;">
      <span style="color: ${data.isLocked ? '#b91c1c' : '#92400e'};">
        <i class="fa-solid ${data.isLocked ? 'fa-lock' : 'fa-triangle-exclamation'}"></i> ${data.studentName}
      </span>
      <span style="font-size: 0.7rem; color: #64748b; font-weight: 600;">${data.timestamp}</span>
    </div>
    <div style="color: #1e293b; font-size: 0.8rem; margin-bottom: 0.2rem; font-weight: 500;">
      ${data.description}
    </div>
    <div style="font-size: 0.725rem; font-weight: 700; color: #64748b;">
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
    osc.frequency.setValueAtTime(660, ctx.currentTime);
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
        inputCode: '999999'
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
