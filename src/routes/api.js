const express = require('express');
const router = express.Router();
const db = require('../database/db');

// Max violation before locking
const MAX_THRESHOLD = parseInt(process.env.MAX_VIOLATION_THRESHOLD || '3');

// 1. Auth Login
router.post('/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  db.get("SELECT u.*, r.name as room_name FROM users u LEFT JOIN rooms r ON u.room_id = r.id WHERE u.username = ?", [username], (err, user) => {
    if (err) return res.status(500).json({ success: false, message: "Database error" });
    if (!user || user.password !== password) {
      return res.status(401).json({ success: false, message: "Username atau password salah!" });
    }

    // If user is a student, ensure exam session exists
    if (user.role === 'student') {
      db.get("SELECT * FROM exam_sessions WHERE student_id = ?", [user.id], (err, session) => {
        if (!session) {
          db.run(
            "INSERT INTO exam_sessions (student_id, room_id, status, violations_count, answers) VALUES (?, ?, 'IN_PROGRESS', 0, '{}')",
            [user.id, user.room_id],
            function(err) {
              return res.json({
                success: true,
                user: { id: user.id, username: user.username, name: user.name, role: user.role, room_id: user.room_id, room_name: user.room_name, nis: user.nis },
                session: { id: this.lastID, status: 'IN_PROGRESS', violations_count: 0, answers: '{}' }
              });
            }
          );
        } else {
          return res.json({
            success: true,
            user: { id: user.id, username: user.username, name: user.name, role: user.role, room_id: user.room_id, room_name: user.room_name, nis: user.nis },
            session
          });
        }
      });
    } else {
      return res.json({
        success: true,
        user: { id: user.id, username: user.username, name: user.name, role: user.role, room_id: user.room_id, room_name: user.room_name }
      });
    }
  });
});

// 2. Get Rooms List
router.get('/rooms', (req, res) => {
  db.all("SELECT * FROM rooms ORDER BY id ASC", [], (err, rooms) => {
    if (err) return res.status(500).json({ success: false, message: "Database error" });
    res.json({ success: true, rooms });
  });
});

// 3. Get Questions List
router.get('/questions', (req, res) => {
  db.all("SELECT id, subject, question_text, options FROM questions", [], (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: "Database error" });
    
    // Parse JSON options
    const questions = rows.map(q => ({
      ...q,
      options: JSON.parse(q.options)
    }));
    res.json({ success: true, questions });
  });
});

// 4. Get Student Session
router.get('/exam/session/:studentId', (req, res) => {
  const { studentId } = req.params;
  db.get("SELECT * FROM exam_sessions WHERE student_id = ?", [studentId], (err, session) => {
    if (err) return res.status(500).json({ success: false, message: "Database error" });
    res.json({ success: true, session: session || null });
  });
});

// 5. Auto-Save Answer
router.post('/exam/answer', (req, res) => {
  const { studentId, questionId, selectedOption } = req.body;
  
  db.get("SELECT * FROM exam_sessions WHERE student_id = ?", [studentId], (err, session) => {
    if (err || !session) return res.status(400).json({ success: false, message: "Sesi tidak ditemukan" });
    if (session.status === 'LOCKED') {
      return res.status(403).json({ success: false, message: "Sesi ujian Anda sedang TERKUNCI!" });
    }

    let answers = {};
    try { answers = JSON.parse(session.answers || '{}'); } catch(e) {}
    answers[questionId] = selectedOption;

    db.run(
      "UPDATE exam_sessions SET answers = ?, updated_at = CURRENT_TIMESTAMP WHERE student_id = ?",
      [JSON.stringify(answers), studentId],
      function(err) {
        if (err) return res.status(500).json({ success: false, message: "Gagal menyimpan jawaban" });
        res.json({ success: true, answers });
      }
    );
  });
});

// 6. Submit Cheating Violation Event
router.post('/exam/violation', (req, res) => {
  const { studentId, roomId, eventType, description } = req.body;
  const io = req.app.get('io');

  db.get("SELECT * FROM exam_sessions WHERE student_id = ?", [studentId], (err, session) => {
    if (err || !session) return res.status(400).json({ success: false, message: "Sesi tidak ditemukan" });

    const newCount = session.violations_count + 1;
    const isLocked = newCount >= MAX_THRESHOLD;
    const newStatus = isLocked ? 'LOCKED' : session.status;

    // Log the cheating event
    db.run(
      "INSERT INTO cheating_events (student_id, room_id, event_type, severity, description) VALUES (?, ?, ?, ?, ?)",
      [studentId, roomId, eventType, isLocked ? 'CRITICAL' : 'WARNING', description]
    );

    // Update exam session
    db.run(
      "UPDATE exam_sessions SET violations_count = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE student_id = ?",
      [newCount, newStatus, studentId],
      function(err) {
        if (err) return res.status(500).json({ success: false, message: "Gagal mengupdate pelanggaran" });

        // Get student details for real-time alert
        db.get("SELECT name, nis FROM users WHERE id = ?", [studentId], (err, student) => {
          const alertPayload = {
            studentId,
            studentName: student ? student.name : `Siswa #${studentId}`,
            nis: student ? student.nis : '',
            roomId,
            eventType,
            description,
            violationsCount: newCount,
            isLocked,
            timestamp: new Date().toLocaleTimeString('id-ID')
          };

          // Broadcast real-time to proctor room
          if (io) {
            io.to(`room-${roomId}`).emit('cheating-alert', alertPayload);
            if (isLocked) {
              io.emit('student-locked', { studentId, roomId });
            }
          }

          res.json({
            success: true,
            violationsCount: newCount,
            isLocked,
            status: newStatus,
            threshold: MAX_THRESHOLD
          });
        });
      }
    );
  });
});

// 7. Submit Exam
router.post('/exam/submit', (req, res) => {
  const { studentId } = req.body;
  db.run("UPDATE exam_sessions SET status = 'SUBMITTED', updated_at = CURRENT_TIMESTAMP WHERE student_id = ?", [studentId], (err) => {
    if (err) return res.status(500).json({ success: false, message: "Gagal mengumpulkan ujian" });
    res.json({ success: true, message: "Ujian berhasil dikumpulkan!" });
  });
});

// 7b. Battery Status Heartbeat Update
router.post('/exam/battery', (req, res) => {
  const { studentId, roomId, batteryLevel, isCharging } = req.body;
  const io = req.app.get('io');

  db.run(
    "UPDATE exam_sessions SET battery_level = ?, is_charging = ?, updated_at = CURRENT_TIMESTAMP WHERE student_id = ?",
    [batteryLevel, isCharging ? 1 : 0, studentId],
    function(err) {
      if (io && roomId) {
        io.to(`room-${roomId}`).emit('battery-update', {
          studentId,
          batteryLevel,
          isCharging: !!isCharging,
          roomId
        });
      }
      res.json({ success: true });
    }
  );
});

// 8. Proctor: Get Room Status (All Assigned Students in a Room)
router.get('/proctor/room-status/:roomId', (req, res) => {
  const { roomId } = req.params;

  const query = `
    SELECT 
      u.id as student_id,
      u.name,
      u.nis,
      u.username,
      COALESCE(es.status, 'NOT_STARTED') as status,
      COALESCE(es.violations_count, 0) as violations_count,
      COALESCE(es.answers, '{}') as answers,
      COALESCE(es.battery_level, 100) as battery_level,
      COALESCE(es.is_charging, 1) as is_charging,
      es.updated_at
    FROM users u
    LEFT JOIN exam_sessions es ON u.id = es.student_id
    WHERE u.role = 'student' AND (u.room_id = ? OR ? = 0)
    ORDER BY u.name ASC
  `;

  db.all(query, [roomId, roomId], (err, students) => {
    if (err) return res.status(500).json({ success: false, message: "Database error" });

    // Fetch recent cheating logs for this room
    db.all(
      `SELECT ce.*, u.name as student_name 
       FROM cheating_events ce 
       JOIN users u ON ce.student_id = u.id 
       WHERE ce.room_id = ? OR ? = 0 
       ORDER BY ce.id DESC LIMIT 15`,
      [roomId, roomId],
      (err, logs) => {
        // Fetch active unlock code for this room
        db.get("SELECT code FROM unlock_codes WHERE (room_id = ? OR ? = 0) AND is_active = 1 ORDER BY id DESC LIMIT 1", [roomId, roomId], (err, codeRow) => {
          res.json({
            success: true,
            students: students.map(s => ({
              ...s,
              answeredCount: Object.keys(JSON.parse(s.answers || '{}')).length
            })),
            logs: logs || [],
            activeCode: codeRow ? codeRow.code : 'Belum Ada'
          });
        });
      }
    );
  });
});

// 9. Proctor: Generate Daily 6-Digit Unlock Code
router.post('/proctor/generate-code', (req, res) => {
  const { roomId } = req.body;
  const newCode = Math.floor(100000 + Math.random() * 900000).toString();
  const io = req.app.get('io');

  // Deactivate old codes for this room
  db.run("UPDATE unlock_codes SET is_active = 0 WHERE room_id = ?", [roomId], () => {
    db.run("INSERT INTO unlock_codes (room_id, code) VALUES (?, ?)", [roomId, newCode], (err) => {
      if (err) return res.status(500).json({ success: false, message: "Gagal membuat kode" });
      
      if (io) {
        io.to(`room-${roomId}`).emit('code-updated', { roomId, code: newCode });
      }

      res.json({ success: true, code: newCode });
    });
  });
});

// 10. Proctor/Student: Unlock Student
router.post('/proctor/unlock-student', (req, res) => {
  const { studentId, inputCode } = req.body;
  const io = req.app.get('io');

  db.get("SELECT * FROM exam_sessions WHERE student_id = ?", [studentId], (err, session) => {
    if (err || !session) return res.status(400).json({ success: false, message: "Sesi tidak ditemukan" });

    // Validate inputCode against active code in student's room OR master code '999999'
    db.get(
      "SELECT * FROM unlock_codes WHERE (room_id = ? OR code = '999999') AND code = ? AND is_active = 1 ORDER BY id DESC LIMIT 1",
      [session.room_id, inputCode],
      (err, codeRecord) => {
        if (!codeRecord && inputCode !== '999999') {
          return res.status(400).json({ success: false, message: "Kode Unlock Salah atau Kedaluwarsa!" });
        }

        // Reset status to IN_PROGRESS and reset violation counter
        db.run(
          "UPDATE exam_sessions SET status = 'IN_PROGRESS', violations_count = 0, updated_at = CURRENT_TIMESTAMP WHERE student_id = ?",
          [studentId],
          (err) => {
            if (err) return res.status(500).json({ success: false, message: "Gagal melepaskan kunci" });

            if (io) {
              io.emit('student-unlocked', { studentId, roomId: session.room_id });
            }

            res.json({ success: true, message: "Kunci layar siswa berhasil dibuka!" });
          }
        );
      }
    );
  });
});

module.exports = router;
