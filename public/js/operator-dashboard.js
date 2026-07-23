let allStudentsData = [];

document.addEventListener('DOMContentLoaded', async () => {
  const userStr = localStorage.getItem('cbt_user');
  if (!userStr) {
    window.location.href = '/index.html';
    return;
  }
  const user = JSON.parse(userStr);
  if (user.role !== 'operator') {
    window.location.href = '/index.html';
    return;
  }

  document.getElementById('operatorName').innerText = user.name;
  await loadStudents();
});

function switchOpTab(tabName) {
  const tabs = ['command-center', 'data-induk', 'jadwal-sesi', 'rekap-nilai'];
  tabs.forEach(t => {
    const btn = document.getElementById(`tab-${t}`);
    const sec = document.getElementById(`section-${t}`);
    if (btn && sec) {
      if (t === tabName) {
        btn.classList.add('active');
        sec.style.display = 'block';
      } else {
        btn.classList.remove('active');
        sec.style.display = 'none';
      }
    }
  });
}

async function loadStudents() {
  try {
    const res = await fetch('/api/operator/students');
    const data = await res.json();

    if (data.success) {
      allStudentsData = data.students;
      renderStudentsTable(allStudentsData);
    }
  } catch (e) {
    console.error("Gagal memuat data siswa:", e);
  }
}

function renderStudentsTable(students) {
  const tbody = document.getElementById('studentListBody');
  tbody.innerHTML = '';

  if (students.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 2rem; color: var(--slate-600);">Tidak ada data siswa yang cocok dengan filter.</td></tr>`;
    return;
  }

  students.forEach((s, index) => {
    const tr = document.createElement('tr');

    tr.innerHTML = `
      <td style="font-weight: 700;">${index + 1}</td>
      <td style="font-weight: 700; color: var(--navy-900);">${s.name}</td>
      <td style="color: var(--slate-600); font-family: var(--font-mono);">${s.nis || '-'}</td>
      <td style="color: var(--blue-600); font-weight: 600;">${s.username}</td>
      <td><span class="badge badge-primary">${s.room_name || `Ruang ${s.room_id}`}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

function filterStudentList() {
  const query = document.getElementById('studentSearchInput').value.toLowerCase().trim();
  const selectedRoom = document.getElementById('classFilterSelect').value;

  const filtered = allStudentsData.filter(s => {
    const matchesSearch = (s.name.toLowerCase().includes(query) || (s.nis && s.nis.includes(query)) || s.username.toLowerCase().includes(query));
    const matchesRoom = (selectedRoom === 'ALL' || s.room_id == selectedRoom);
    return matchesSearch && matchesRoom;
  });

  renderStudentsTable(filtered);
}

function openAddStudentModal() {
  document.getElementById('addStudentModal').classList.add('active');
}

function closeAddStudentModal() {
  document.getElementById('addStudentModal').classList.remove('active');
}

async function saveNewStudent(e) {
  e.preventDefault();
  const name = document.getElementById('sName').value;
  const nis = document.getElementById('sNis').value;
  const username = document.getElementById('sUsername').value;
  const room_id = parseInt(document.getElementById('sRoom').value);

  try {
    const res = await fetch('/api/operator/student', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, nis, username, room_id, password: '123456' })
    });
    const data = await res.json();

    if (data.success) {
      alert(data.message);
      closeAddStudentModal();
      document.getElementById('addStudentForm').reset();
      await loadStudents();
    } else {
      alert(data.message);
    }
  } catch (err) {
    alert('Gagal terhubung ke server');
  }
}

function logout() {
  localStorage.clear();
  window.location.href = '/index.html';
}
