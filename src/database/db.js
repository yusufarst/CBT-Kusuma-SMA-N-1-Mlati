const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'cbt_kusuma.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  // 1. Rooms Table
  db.run(`CREATE TABLE IF NOT EXISTS rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL
  )`);

  // 2. Users Table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL, -- 'student', 'teacher', 'operator', 'superadmin'
    room_id INTEGER,
    nis TEXT,
    FOREIGN KEY(room_id) REFERENCES rooms(id)
  )`);

  // 3. Questions Table
  db.run(`CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subject TEXT NOT NULL,
    question_text TEXT NOT NULL,
    options TEXT NOT NULL, -- JSON array of strings
    correct_answer INTEGER NOT NULL
  )`);

  // 4. Exam Sessions Table
  db.run(`CREATE TABLE IF NOT EXISTS exam_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER UNIQUE NOT NULL,
    room_id INTEGER NOT NULL,
    status TEXT DEFAULT 'IN_PROGRESS', -- 'NOT_STARTED', 'IN_PROGRESS', 'LOCKED', 'SUBMITTED'
    violations_count INTEGER DEFAULT 0,
    answers TEXT DEFAULT '{}', -- JSON object key-value { questionId: selectedIndex }
    battery_level INTEGER DEFAULT 100,
    is_charging INTEGER DEFAULT 1,
    start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(student_id) REFERENCES users(id),
    FOREIGN KEY(room_id) REFERENCES rooms(id)
  )`);

  // 5. Cheating Events Table
  db.run(`CREATE TABLE IF NOT EXISTS cheating_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    room_id INTEGER NOT NULL,
    event_type TEXT NOT NULL, -- 'TAB_SWITCH', 'BLUR', 'FULLSCREEN_EXIT', 'DEVTOOLS', 'COPY_PASTE'
    severity TEXT DEFAULT 'WARNING', -- 'WARNING', 'CRITICAL'
    description TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(student_id) REFERENCES users(id),
    FOREIGN KEY(room_id) REFERENCES rooms(id)
  )`);

  // 6. Daily Unlock Codes Table
  db.run(`CREATE TABLE IF NOT EXISTS unlock_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id INTEGER NOT NULL,
    code TEXT NOT NULL,
    generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_active INTEGER DEFAULT 1,
    FOREIGN KEY(room_id) REFERENCES rooms(id)
  )`);

  // --- SEED OFFICIAL INSTITUTIONAL DATA ---
  db.get("SELECT COUNT(*) as count FROM rooms", (err, row) => {
    if (row && row.count === 0) {
      console.log("Seeding 12 Official SMAN 1 Mlati Classes...");
      const rooms = [
        "Ruang 01 (Kelas X A)", "Ruang 02 (Kelas X B)", "Ruang 03 (Kelas X C)", "Ruang 04 (Kelas X D)",
        "Ruang 05 (Kelas XI A)", "Ruang 06 (Kelas XI B)", "Ruang 07 (Kelas XI C)", "Ruang 08 (Kelas XI D)",
        "Ruang 09 (Kelas XII A)", "Ruang 10 (Kelas XII B)", "Ruang 11 (Kelas XII C)", "Ruang 12 (Kelas XII D)"
      ];
      const stmtRoom = db.prepare("INSERT INTO rooms (name, code) VALUES (?, ?)");
      rooms.forEach((rName, idx) => {
        stmtRoom.run(rName, `KLS-RM-${idx + 1}`);
      });
      stmtRoom.finalize();
    }
  });

  // Seed Core Accounts (Pak Yusuf, Operator, Super Admin, Demo Students)
  db.get("SELECT COUNT(*) as count FROM users WHERE username = 'yusuf@sman1mlati.sch.id'", (err, row) => {
    if (!row || row.count === 0) {
      console.log("Seeding Official Staff & Teacher Accounts...");
      db.run("INSERT INTO users (username, password, name, role, room_id) VALUES ('yusuf@sman1mlati.sch.id', '123456', 'Yusuf Arif Setiawan, S.Pd., M.M.', 'teacher', 1)");
      db.run("INSERT INTO users (username, password, name, role) VALUES ('operator@sman1mlati.sch.id', 'admin123', 'Operator CBT (Mas Yusuf)', 'operator')");
      db.run("INSERT INTO users (username, password, name, role) VALUES ('admin@sman1mlati.sch.id', 'superadmin123', 'Super Admin System', 'superadmin')");
      db.run("INSERT INTO users (username, password, name, role, room_id, nis) VALUES ('siswa001@sman1mlati.sch.id', '123456', 'Ahmad Fauzi', 'student', 1, '20261001')");
      db.run("INSERT INTO users (username, password, name, role, room_id, nis) VALUES ('guru001@sman1mlati.sch.id', '123456', 'Dra. Ani Suryani (Guru/Pengawas)', 'teacher', 1)");
    }
  });

  // Seed 287 Official Students from students_data.json
  const jsonPath = path.join(__dirname, '..', '..', 'students_data.json');
  if (fs.existsSync(jsonPath)) {
    db.get("SELECT COUNT(*) as count FROM users WHERE role = 'student'", (err, row) => {
      if (row && row.count < 10) {
        console.log("Seeding 287 Official SMAN 1 Mlati Students...");
        try {
          const studentsList = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
          const stmtStudent = db.prepare("INSERT OR IGNORE INTO users (username, password, name, role, room_id, nis) VALUES (?, '123456', ?, 'student', ?, ?)");
          studentsList.forEach(s => {
            stmtStudent.run(s.username, s.name, s.room_id || 1, s.nis);
          });
          stmtStudent.finalize();
          console.log(`Successfully seeded ${studentsList.length} official students.`);
        } catch (e) {
          console.error("Error seeding students_data.json:", e);
        }
      }
    });
  }

  // Seed Demo Questions
  db.get("SELECT COUNT(*) as count FROM questions", (err, row) => {
    if (row && row.count === 0) {
      console.log("Seeding Demo Questions...");
      const stmtQ = db.prepare("INSERT INTO questions (subject, question_text, options, correct_answer) VALUES (?, ?, ?, ?)");
      stmtQ.run(
        "Ekonomi X",
        "Masalah pokok ekonomi modern yang dihadapi oleh setiap masyarakat adalah menentukan...",
        JSON.stringify([
          "Apa dan berapa banyak barang yang akan diproduksi (What)",
          "Bagaimana cara memproduksi barang tersebut (How)",
          "Untuk siapa barang tersebut diproduksi (For Whom)",
          "Semua jawaban A, B, dan C benar",
          "Hanya jawaban A dan B yang benar"
        ]),
        3
      );
      stmtQ.run(
        "Ekonomi X",
        "Hukum penawaran menyatakan bahwa apabila harga suatu barang naik, maka jumlah barang yang ditawarkan akan...",
        JSON.stringify([
          "Turun",
          "Tetap",
          "Naik",
          "Berbanding terbalik",
          "Tidak terpengaruh"
        ]),
        2
      );
      stmtQ.run(
        "Ekonomi X",
        "Manakah dari berikut ini yang merupakan contoh dari kebijakan moneter yang dilakukan oleh Bank Sentral?",
        JSON.stringify([
          "Menaikkan tarif pajak penghasilan",
          "Mengatur jumlah uang yang beredar melalui operasi pasar terbuka",
          "Mengurangi pengeluaran belanja negara",
          "Memberikan subsidi bahan pokok",
          "Membangun infrastruktur jalan tol"
        ]),
        1
      );
      stmtQ.run(
        "Ekonomi X",
        "Pasar di mana terdapat banyak penjual dan pembeli, serta barang yang diperjualbelikan bersifat homogen disebut...",
        JSON.stringify([
          "Pasar Monopoli",
          "Pasar Oligopoli",
          "Pasar Persaingan Sempurna",
          "Pasar Monopolistik",
          "Pasar Monopsoni"
        ]),
        2
      );
      stmtQ.run(
        "Ekonomi X",
        "Sistem ekonomi di mana pemerintah memegang kendali penuh atas semua kegiatan ekonomi disebut...",
        JSON.stringify([
          "Sistem Ekonomi Pasar / Kapitalis",
          "Sistem Ekonomi Komando / Terpusat",
          "Sistem Ekonomi Campuran",
          "Sistem Ekonomi Tradisional",
          "Sistem Ekonomi Syariah"
        ]),
        1
      );
      stmtQ.finalize();
    }
  });

  // Seed Initial Unlock Codes
  db.get("SELECT COUNT(*) as count FROM unlock_codes", (err, row) => {
    if (row && row.count === 0) {
      db.run("INSERT INTO unlock_codes (room_id, code) VALUES (1, '849201')");
      db.run("INSERT INTO unlock_codes (room_id, code) VALUES (2, '705326')");
    }
  });

  // Safe migrations
  db.run("ALTER TABLE exam_sessions ADD COLUMN battery_level INTEGER DEFAULT 100", () => {});
  db.run("ALTER TABLE exam_sessions ADD COLUMN is_charging INTEGER DEFAULT 1", () => {});
});

module.exports = db;
