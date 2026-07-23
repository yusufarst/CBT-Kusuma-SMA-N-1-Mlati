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
        btn.className = 'tab-btn active';
        btn.style.color = '#2563eb';
        btn.style.borderBottom = '3px solid #2563eb';
        sec.style.display = 'block';
      } else {
        btn.className = 'tab-btn';
        btn.style.color = '#64748b';
        btn.style.borderBottom = 'none';
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
      const tbody = document.getElementById('studentListBody');
      tbody.innerHTML = '';

      data.students.forEach((s, index) => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid #e2e8f0';

        tr.innerHTML = `
          <td style="padding: 0.85rem 1.25rem; font-weight: 700;">${index + 1}</td>
          <td style="padding: 0.85rem 1.25rem; font-weight: 700; color: #0f172a;">${s.name}</td>
          <td style="padding: 0.85rem 1.25rem; color: #475569;">${s.nis || '-'}</td>
          <td style="padding: 0.85rem 1.25rem; color: #2563eb; font-weight: 600;">${s.username}</td>
          <td style="padding: 0.85rem 1.25rem;"><span class="badge badge-primary">${s.room_name || `Ruang ${s.room_id}`}</span></td>
        `;
        tbody.appendChild(tr);
      });
    }
  } catch (e) {
    console.error("Gagal memuat data siswa:", e);
  }
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
