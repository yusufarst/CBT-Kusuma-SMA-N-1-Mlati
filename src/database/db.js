const sqlite3 = require('sqlite3').verbose();
const path = require('path');

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
    role TEXT NOT NULL, -- 'student', 'teacher', 'operator'
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

  // --- SEED INITIAL DEMO DATA ---
  db.get("SELECT COUNT(*) as count FROM rooms", (err, row) => {
    if (row && row.count === 0) {
      console.log("Seeding initial CBT Kusuma demo data...");

      // Seed Rooms
      const stmtRoom = db.prepare("INSERT INTO rooms (name, code) VALUES (?, ?)");
      stmtRoom.run("Ruang 01 (X MIPA 1)", "RUANG-01");
      stmtRoom.run("Ruang 02 (X MIPA 2)", "RUANG-02");
      stmtRoom.run("Lab Komputer Utama", "LAB-KOMP-1");
      stmtRoom.finalize();

      // Seed Users
      const stmtUser = db.prepare("INSERT INTO users (username, password, name, role, room_id, nis) VALUES (?, ?, ?, ?, ?, ?)");
      // Pengawas (Guru) & Operator
      stmtUser.run("guru001@sman1mlati.sch.id", "123456", "Dra. Ani Suryani (Guru/Pengawas)", "teacher", 1, null);
      stmtUser.run("guru002@sman1mlati.sch.id", "123456", "Budi Santoso, S.Pd. (Guru/Pengawas)", "teacher", 2, null);
      stmtUser.run("operator@sman1mlati.sch.id", "admin123", "Operator CBT (Mas Yusuf)", "operator", null, null);

      // Siswa Ruang 01
      stmtUser.run("siswa001@sman1mlati.sch.id", "123456", "Ahmad Fauzi", "student", 1, "20261001");
      stmtUser.run("siswa002@sman1mlati.sch.id", "123456", "Bella Anggraini", "student", 1, "20261002");
      stmtUser.run("siswa103@sman1mlati.sch.id", "123456", "Candra Wijaya", "student", 1, "20261003");
      stmtUser.run("siswa104@sman1mlati.sch.id", "123456", "Dina Mariana", "student", 1, "20261004");
      stmtUser.run("siswa105@sman1mlati.sch.id", "123456", "Eko Prasetyo", "student", 1, "20261005");

      // Siswa Ruang 02
      stmtUser.run("siswa003@sman1mlati.sch.id", "123456", "Fajar Hidayat", "student", 2, "20262001");
      stmtUser.run("siswa202@sman1mlati.sch.id", "123456", "Gita Gutawa", "student", 2, "20262002");
      stmtUser.run("siswa203@sman1mlati.sch.id", "123456", "Hendra Setiawan", "student", 2, "20262003");
      stmtUser.finalize();

      // Seed Questions (Ekonomi / Pengetahuan Umum High School)
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

      // Seed Initial Active Code for Room 1
      db.run("INSERT INTO unlock_codes (room_id, code) VALUES (1, '849201')");
      db.run("INSERT INTO unlock_codes (room_id, code) VALUES (2, '512934')");

      console.log("Seeding completed successfully.");
    }

    // Auto-migrate any existing database records to use @sman1mlati.sch.id email domain
    db.run("UPDATE users SET username = 'guru001@sman1mlati.sch.id' WHERE username IN ('pengawas1', 'guru001')");
    db.run("UPDATE users SET username = 'guru002@sman1mlati.sch.id' WHERE username IN ('pengawas2', 'guru002')");
    db.run("UPDATE users SET username = 'operator@sman1mlati.sch.id' WHERE username = 'operator'");
    db.run("UPDATE users SET username = 'siswa001@sman1mlati.sch.id' WHERE username IN ('siswa101', 'siswa001')");
    db.run("UPDATE users SET username = 'siswa002@sman1mlati.sch.id' WHERE username IN ('siswa102', 'siswa002')");
    db.run("UPDATE users SET username = 'siswa003@sman1mlati.sch.id' WHERE username IN ('siswa201', 'siswa003')");

    // Safe migration for battery columns
    db.run("ALTER TABLE exam_sessions ADD COLUMN battery_level INTEGER DEFAULT 100", () => {});
    db.run("ALTER TABLE exam_sessions ADD COLUMN is_charging INTEGER DEFAULT 1", () => {});
  });
});

module.exports = db;
