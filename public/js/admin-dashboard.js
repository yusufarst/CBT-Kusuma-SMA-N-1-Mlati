document.addEventListener('DOMContentLoaded', async () => {
  const userStr = localStorage.getItem('cbt_user');
  if (!userStr) {
    window.location.href = '/index.html';
    return;
  }
  const user = JSON.parse(userStr);
  if (user.role !== 'superadmin') {
    window.location.href = '/index.html';
    return;
  }

  document.getElementById('adminName').innerText = user.name;
  await loadUsers();
});

function switchAdminTab(tabName) {
  const tabs = ['users', 'security', 'health', 'backup'];
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

async function loadUsers() {
  try {
    const res = await fetch('/api/admin/users');
    const data = await res.json();

    if (data.success) {
      const tbody = document.getElementById('userListBody');
      tbody.innerHTML = '';

      data.users.forEach((u) => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid #e2e8f0';

        let roleBadge = '';
        if (u.role === 'superadmin') roleBadge = `<span class="badge badge-danger">Super Admin</span>`;
        else if (u.role === 'operator') roleBadge = `<span class="badge badge-warning">Operator</span>`;
        else if (u.role === 'teacher') roleBadge = `<span class="badge badge-success">Guru/Pengawas</span>`;
        else roleBadge = `<span class="badge badge-primary">Siswa</span>`;

        tr.innerHTML = `
          <td style="padding: 0.85rem 1.25rem; font-weight: 700;">${u.id}</td>
          <td style="padding: 0.85rem 1.25rem; font-weight: 700; color: #0f172a;">${u.name}</td>
          <td style="padding: 0.85rem 1.25rem; color: #2563eb; font-weight: 600;">${u.username}</td>
          <td style="padding: 0.85rem 1.25rem;">${roleBadge}</td>
          <td style="padding: 0.85rem 1.25rem;">
            <button onclick="deleteUser(${u.id}, '${u.name}')" class="btn btn-outline" style="padding: 0.35rem 0.65rem; font-size: 0.75rem; color: #dc2626;">
              <i class="fa-solid fa-trash"></i> Hapus
            </button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    }
  } catch (e) {
    console.error("Gagal memuat daftar user:", e);
  }
}

function openAddUserModal() {
  document.getElementById('addUserModal').classList.add('active');
}

function closeAddUserModal() {
  document.getElementById('addUserModal').classList.remove('active');
}

async function saveNewUser(e) {
  e.preventDefault();
  const name = document.getElementById('uName').value;
  const username = document.getElementById('uUsername').value;
  const password = document.getElementById('uPassword').value;
  const role = document.getElementById('uRole').value;

  try {
    const res = await fetch('/api/admin/user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, username, password, role })
    });
    const data = await res.json();

    if (data.success) {
      alert(data.message);
      closeAddUserModal();
      document.getElementById('addUserForm').reset();
      await loadUsers();
    } else {
      alert(data.message);
    }
  } catch (err) {
    alert('Gagal menyambung ke server');
  }
}

async function deleteUser(id, name) {
  if (confirm(`Apakah Anda yakin ingin menghapus user "${name}"?`)) {
    try {
      const res = await fetch(`/api/admin/user/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        await loadUsers();
      } else {
        alert(data.message);
      }
    } catch (e) {
      alert('Gagal menghapus user');
    }
  }
}

function logout() {
  localStorage.clear();
  window.location.href = '/index.html';
}
