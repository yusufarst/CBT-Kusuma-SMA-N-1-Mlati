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
    event_type TEXT NOT NULL,
    severity TEXT DEFAULT 'WARNING',
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

  // --- SEED 12 OFFICIAL CLASSES & 29 OFFICIAL TEACHERS OF SMAN 1 MLATI ---
  db.get("SELECT COUNT(*) as count FROM rooms WHERE code LIKE 'KLS-%'", (err, row) => {
    if (!row || row.count < 12) {
      console.log("Seeding 12 Official Classes...");
      db.run("DELETE FROM rooms");

      const stmtRoom = db.prepare("INSERT INTO rooms (name, code) VALUES (?, ?)");
      stmtRoom.run("Kelas X A", "KLS-XA");
      stmtRoom.run("Kelas X B", "KLS-XB");
      stmtRoom.run("Kelas X C", "KLS-XC");
      stmtRoom.run("Kelas X D", "KLS-XD");
      stmtRoom.run("Kelas XI A", "KLS-XIA");
      stmtRoom.run("Kelas XI B", "KLS-XIB");
      stmtRoom.run("Kelas XI C", "KLS-XIC");
      stmtRoom.run("Kelas XI D", "KLS-XID");
      stmtRoom.run("Kelas XII A", "KLS-XIIA");
      stmtRoom.run("Kelas XII B", "KLS-XIIB");
      stmtRoom.run("Kelas XII C", "KLS-XIIC");
      stmtRoom.run("Kelas XII D", "KLS-XIID");
      stmtRoom.run("Lab Komputer Utama", "LAB-KOMP-1");
      stmtRoom.finalize();
    }
  });

  // Seed / Upsert Official Users (Super Admin, Operator, 29 Teachers)
  const teachersList = [
    { username: "guru01@sman1mlati.sch.id", name: "Eko Yuliyanto, S.Pd., M.Pd. (BK)", pass: "123456" },
    { username: "guru02@sman1mlati.sch.id", name: "Dra. Retno Endah Sawitri, M.Ag. (PAI)", pass: "123456" },
    { username: "guru03@sman1mlati.sch.id", name: "Yoga Aditya Sumantri, S.Pd., M.Pd. (PAI)", pass: "123456" },
    { username: "guru04@sman1mlati.sch.id", name: "Teresia Kus Margaritawati, S.Pd. (Katolik)", pass: "123456" },
    { username: "guru05@sman1mlati.sch.id", name: "Alfa Apriliani, S.Pd.K (Kristen)", pass: "123456" },
    { username: "guru06@sman1mlati.sch.id", name: "Trida Purwa Maduria, S.Pd.H (Hindu)", pass: "123456" },
    { username: "guru07@sman1mlati.sch.id", name: "Ervin Iswandayani, S.Pd. (Pancasila)", pass: "123456" },
    { username: "guru08@sman1mlati.sch.id", name: "Suparwanto, S.Pd. (B. Indonesia)", pass: "123456" },
    { username: "guru09@sman1mlati.sch.id", name: "Dra. Suwarni (B. Indonesia)", pass: "123456" },
    { username: "guru10@sman1mlati.sch.id", name: "Janti Ikawati, S.Pd.Si. (Matematika)", pass: "123456" },
    { username: "guru11@sman1mlati.sch.id", name: "Dian Tri Handayani, S.Si. (Matematika)", pass: "123456" },
    { username: "guru12@sman1mlati.sch.id", name: "Endra Prasetyana, S.Pd., M.Pd. (B. Inggris Lanjut)", pass: "123456" },
    { username: "guru13@sman1mlati.sch.id", name: "Dra. Sulismiyani (B. Inggris)", pass: "123456" },
    { username: "guru14@sman1mlati.sch.id", name: "Dyah Astrianita, S.Pd. (Seni Budaya)", pass: "123456" },
    { username: "guru15@sman1mlati.sch.id", name: "Rizka Restuningjati, S.Pd. (PJOK)", pass: "123456" },
    { username: "guru16@sman1mlati.sch.id", name: "Abdul Afif Rosyidi, S.Pd. (B. Jawa)", pass: "123456" },
    { username: "guru17@sman1mlati.sch.id", name: "Kuswantini, S.Pd. (Fisika)", pass: "123456" },
    { username: "guru18@sman1mlati.sch.id", name: "Ratika Nur Jasmin, S.Pd. (Fisika / PKWU)", pass: "123456" },
    { username: "guru19@sman1mlati.sch.id", name: "Sri Suprapti, S.Pd. (Biologi)", pass: "123456" },
    { username: "guru20@sman1mlati.sch.id", name: "Permani Try Wijiarti, S.Pd. (Kimia)", pass: "123456" },
    { username: "guru21@sman1mlati.sch.id", name: "Sukarni, S.Pd. (Geografi)", pass: "123456" },
    { username: "guru22@sman1mlati.sch.id", name: "Sutrisni, S.Pd. (Sosiologi)", pass: "123456" },
    { username: "guru23@sman1mlati.sch.id", name: "Suryanto, S.Pd. (Ekonomi)", pass: "123456" },
    { username: "guru24@sman1mlati.sch.id", name: "Anantyas Kusuma Dewi, S.Pd. (Informatika)", pass: "123456" },
    { username: "guru25@sman1mlati.sch.id", name: "Sri Ati Ati, S.Pd. (Sejarah)", pass: "123456" },
    { username: "yusuf@sman1mlati.sch.id", name: "Yusuf Arif Setiawan, S.Pd., M.M. (Ekonomi)", pass: "123456" },
    { username: "guru27@sman1mlati.sch.id", name: "Whyni Ariani, S.Pd. (BK)", pass: "123456" },
    { username: "guru28@sman1mlati.sch.id", name: "Dian Sih Febriani, S.Psi. (BK)", pass: "123456" },
    { username: "guru29@sman1mlati.sch.id", name: "Gabriella Laras Anggitaningtyas, S.Pd. (BK)", pass: "123456" }
  ];

  // Super Admin & Operator
  db.run("INSERT OR IGNORE INTO users (username, password, name, role, room_id, nis) VALUES ('admin@sman1mlati.sch.id', 'superadmin123', 'Super Admin System (Bpk. Drs. Headmaster)', 'superadmin', null, null)");
  db.run("INSERT OR IGNORE INTO users (username, password, name, role, room_id, nis) VALUES ('operator@sman1mlati.sch.id', 'admin123', 'Operator CBT (Mas Yusuf)', 'operator', null, null)");

  // Insert 29 Teachers
  teachersList.forEach(t => {
    db.run("INSERT OR IGNORE INTO users (username, password, name, role, room_id, nis) VALUES (?, ?, ?, 'teacher', 1, null)", [t.username, t.pass, t.name]);
  });

  // Seed 287 Official Students from students_data.json
  const studentsJsonPath = path.join(__dirname, '../../students_data.json');
  if (fs.existsSync(studentsJsonPath)) {
    const studentsData = JSON.parse(fs.readFileSync(studentsJsonPath, 'utf8'));
    console.log(`Seeding ${studentsData.length} official SMAN 1 Mlati students into database...`);

    const stmtStudent = db.prepare("INSERT OR IGNORE INTO users (username, password, name, role, room_id, nis) VALUES (?, '123456', ?, 'student', ?, ?)");
    
    // Quick Demo alias for first student
    db.run("INSERT OR IGNORE INTO users (username, password, name, role, room_id, nis) VALUES ('siswa001@sman1mlati.sch.id', '123456', 'Achmad Galih Indrayanto (Demo Siswa)', 'student', 1, '3725')");

    studentsData.forEach(s => {
      stmtStudent.run(s.username, s.name, s.room_id, s.nis);
    });
    stmtStudent.finalize();
  }

  // Seed Sample Questions if empty
  db.get("SELECT COUNT(*) as count FROM questions", (err, row) => {
    if (row && row.count === 0) {
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
        "Informatika X",
        "Manakah di antara berikut ini yang merupakan fondasi berpikir komputasional (Computational Thinking)?",
        JSON.stringify([
          "Dekomposisi, Pengenalan Pola, Abstraksi, dan Algoritma",
          "Pengodean, Kompilasi, Debugging, dan Testing",
          "Desain Grafis, Animasi, Pengolahan Data, dan Jaringan",
          "Hardware, Software, Brainware, dan Firmware",
          "Internet, Intranet, Bluetooth, dan Wi-Fi"
        ]),
        0
      );
      stmtQ.finalize();
    }
  });

  // Unlock codes default
  db.run("INSERT OR IGNORE INTO unlock_codes (room_id, code) VALUES (1, '849201')");
  db.run("INSERT OR IGNORE INTO unlock_codes (room_id, code) VALUES (2, '512934')");
});

module.exports = db;
