document.addEventListener('DOMContentLoaded', async () => {
  const userStr = localStorage.getItem('cbt_user');
  if (!userStr) {
    window.location.href = '/index.html';
    return;
  }
  const user = JSON.parse(userStr);
  if (user.role !== 'teacher') {
    window.location.href = '/index.html';
    return;
  }

  document.getElementById('teacherName').innerText = user.name;
  await loadQuestions();
});

function switchTeacherTab(tabName) {
  const tabs = ['bank-soal', 'buat-ujian', 'pengawasan', 'analisis'];
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

async function loadQuestions() {
  try {
    const res = await fetch('/api/questions');
    const data = await res.json();

    if (data.success) {
      const tbody = document.getElementById('questionListBody');
      tbody.innerHTML = '';

      data.questions.forEach((q, index) => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid #e2e8f0';

        const optStr = q.options.map((opt, i) => `<div><strong>${String.fromCharCode(65 + i)}:</strong> ${opt}</div>`).join('');
        const correctLetter = String.fromCharCode(65 + q.correct_answer);

        tr.innerHTML = `
          <td style="padding: 1rem 1.25rem; font-weight: 700;">${index + 1}</td>
          <td style="padding: 1rem 1.25rem;"><span class="badge badge-primary">${q.subject}</span></td>
          <td style="padding: 1rem 1.25rem; font-weight: 600; color: #0f172a; max-width: 400px;">${q.question_text}</td>
          <td style="padding: 1rem 1.25rem; font-size: 0.8rem; color: #475569;">${optStr}</td>
          <td style="padding: 1rem 1.25rem;"><span class="badge badge-success">Opsi ${correctLetter}</span></td>
        `;
        tbody.appendChild(tr);
      });
    }
  } catch (e) {
    console.error("Gagal memuat soal:", e);
  }
}

function openAddQuestionModal() {
  document.getElementById('addQuestionModal').classList.add('active');
}

function closeAddQuestionModal() {
  document.getElementById('addQuestionModal').classList.remove('active');
}

function openImportModal() {
  alert('Template Excel Soal (.xlsx) Siap Diunggah!\nPilih file Excel untuk mengimpor soal massal.');
}

async function saveNewQuestion(e) {
  e.preventDefault();
  const subject = document.getElementById('qSubject').value;
  const questionText = document.getElementById('qText').value;
  const options = [
    document.getElementById('opt0').value,
    document.getElementById('opt1').value,
    document.getElementById('opt2').value,
    document.getElementById('opt3').value,
    document.getElementById('opt4').value
  ];
  const correctAnswer = parseInt(document.getElementById('qCorrect').value);

  try {
    const res = await fetch('/api/teacher/question', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject, questionText, options, correctAnswer })
    });
    const data = await res.json();

    if (data.success) {
      alert(data.message);
      closeAddQuestionModal();
      document.getElementById('addQForm').reset();
      await loadQuestions();
    } else {
      alert(data.message);
    }
  } catch (err) {
    alert('Gagal menyambung ke server');
  }
}

function logout() {
  localStorage.clear();
  window.location.href = '/index.html';
}
