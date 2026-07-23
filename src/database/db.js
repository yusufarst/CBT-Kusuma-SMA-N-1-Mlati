const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'cbt_kusuma.db');
const db = new sqlite3.Database(dbPath);

const questions50 = [
  { q: "Masalah pokok ekonomi modern yang dihadapi oleh setiap masyarakat adalah menentukan...", opts: ["Apa dan berapa banyak barang yang akan diproduksi (What)", "Bagaimana cara memproduksi barang tersebut (How)", "Untuk siapa barang tersebut diproduksi (For Whom)", "Semua jawaban A, B, dan C benar", "Hanya jawaban A dan B yang benar"], c: 3 },
  { q: "Hukum penawaran menyatakan bahwa apabila harga suatu barang naik, maka jumlah barang yang ditawarkan akan...", opts: ["Turun", "Tetap", "Naik", "Berbanding terbalik", "Tidak terpengaruh"], c: 2 },
  { q: "Manakah dari berikut ini yang merupakan contoh dari kebijakan moneter yang dilakukan oleh Bank Sentral?", opts: ["Menaikkan tarif pajak penghasilan", "Mengatur jumlah uang yang beredar melalui operasi pasar terbuka", "Mengurangi pengeluaran belanja negara", "Memberikan subsidi bahan pokok", "Membangun infrastruktur jalan tol"], c: 1 },
  { q: "Pasar di mana terdapat banyak penjual dan pembeli, serta barang yang diperjualbelikan bersifat homogen disebut...", opts: ["Pasar Monopoli", "Pasar Oligopoli", "Pasar Persaingan Sempurna", "Pasar Monopolistik", "Pasar Monopsoni"], c: 2 },
  { q: "Sistem ekonomi di mana pemerintah memegang kendali penuh atas semua kegiatan ekonomi disebut...", opts: ["Sistem Ekonomi Pasar / Kapitalis", "Sistem Ekonomi Komando / Terpusat", "Sistem Ekonomi Campuran", "Sistem Ekonomi Tradisional", "Sistem Ekonomi Syariah"], c: 1 },
  { q: "Keinginan manusia yang tidak terbatas dihadapkan dengan alat pemuas kebutuhan yang terbatas disebut masalah...", opts: ["Kelangkaan (Scarcity)", "Kemiskinan", "Pemerataan", "Inflasi", "Pengangguran"], c: 0 },
  { q: "Biaya yang dikorbankan karena memilih opsi alternatif terbaik lainnya disebut...", opts: ["Biaya Produksi", "Biaya Peluang (Opportunity Cost)", "Biaya Variabel", "Biaya Tetap", "Biaya Marjinal"], c: 1 },
  { q: "Fungsi permintaan menunjukkan hubungan antara harga barang dengan...", opts: ["Jumlah barang yang ditawarkan", "Jumlah barang yang diminta", "Biaya produksi", "Pendapatan nasional", "Tingkat inflasi"], c: 1 },
  { q: "Hukum permintaan menyatakan bahwa jika harga suatu barang naik, maka jumlah permintaan akan...", opts: ["Naik", "Turun", "Tetap", "Tak terhingga", "Sama dengan penawaran"], c: 1 },
  { q: "Indikator yang digunakan untuk mengukur tingkat kenaikan harga barang dan jasa secara umum adalah...", opts: ["PDB", "IHK / Inflasi", "Suku Bunga", "Nilai Tukar", "Gini Ratio"], c: 1 },
  { q: "Pajak Pertambahan Nilai (PPN) termasuk dalam kategori pajak...", opts: ["Pajak Langsung", "Pajak Tidak Langsung", "Pajak Daerah", "Pajak Ekspor", "Pajak Restoran"], c: 1 },
  { q: "Badan usaha yang modalnya dimiliki seluruhnya atau sebagian oleh negara disebut...", opts: ["BUMS", "BUMN", "Koperasi", "CV", "Firma"], c: 1 },
  { q: "Asas utama yang melandasi kegiatan koperasi di Indonesia adalah...", opts: ["Kekeluargaan", "Keuntungan Sebesar-besarnya", "Persaingan Bebas", "Monopoli", "Individualisme"], c: 0 },
  { q: "Bank yang bertugas memelihara kestabilan nilai rupiah di Indonesia adalah...", opts: ["Bank Rakyat Indonesia (BRI)", "Bank Mandiri", "Bank Indonesia (BI)", "Bank Tabungan Negara (BTN)", "Otoritas Jasa Keuangan (OJK)"], c: 2 },
  { q: "Lembaga independent yang bertugas mengawasi seluruh kegiatan di dalam sektor jasa keuangan adalah...", opts: ["LPS", "OJK", "BI", "Kemenkeu", "Bappenas"], c: 1 },
  { q: "Perbedaan utama antara uang kartal dan uang giral terletak pada...", opts: ["Bahan pembuatannya", "Penerbit dan bentuk fisiknya", "Nilai nominalnya", "Fungsinya sebagai alat tukar", "Masa berlakunya"], c: 1 },
  { q: "Pengeluaran pemerintah untuk pembangunan sarana umum seperti jalan dan jembatan disebut belanja...", opts: ["Rutin", "Modal", "Pegawai", "Subsidi", "Hibah"], c: 1 },
  { q: "Alat pembayaran internasional yang umum diterima dalam perdagangan antar negara disebut...", opts: ["Uang Kartal", "Devisa", "Cek", "Bilyet Giro", "Obligasi"], c: 1 },
  { q: "Pernyataan yang benar mengenai kurva permintaan adalah...", opts: ["Mempunyai kemiringan (slope) positif", "Mempunyai kemiringan (slope) negatif", "Sejajar dengan sumbu horizontal", "Tegak lurus dengan sumbu vertikal", "Selalu berbentuk lingkaran"], c: 1 },
  { q: "Kondisi di mana jumlah barang yang diminta sama dengan jumlah barang yang ditawarkan disebut...", opts: ["Surplus", "Defisit", "Keseimbangan Pasar (Equilibrium)", "Inflasi", "Stagflasi"], c: 2 },
  { q: "Tindakan penghitungan total nilai barang dan jasa akhir yang dihasilkan suatu negara dalam satu tahun disebut...", opts: ["Pendapatan Per Kapita", "Produk Domestik Bruto (PDB)", "Pendapatan Nasional Bersih", "Anggaran Pendapatan Belanja Negara", "Neraca Perdagangan"], c: 1 },
  { q: "Pihak yang melakukan kegiatan konsumsi barang dan jasa disebut...", opts: ["Produsen", "Konsumen", "Distributor", "Regulator", "Eksportir"], c: 1 },
  { q: "Saluran distribusi langsung berarti barang disalurkan dari produsen ke konsumen...", opts: ["Melalui grosir", "Melalui pengecer", "Tanpa perantara", "Melalui agen komisioner", "Melalui distributor tunggal"], c: 2 },
  { q: "Kemampuan suatu barang untuk memenuhi kebutuhan manusia disebut...", opts: ["Utility (Nilai Guna)", "Produktivitas", "Efisiensi", "Profitabilitas", "Elastisitas"], c: 0 },
  { q: "Faktor produksi utama yang bersifat alamiah adalah...", opts: ["Tenaga Kerja", "Modal", "Tanah / Sumber Daya Alam", "Kewirausahaan", "Teknologi"], c: 2 },
  { q: "Pengolahan bahan mentah menjadi barang jadi merupakan contoh kegiatan produksi sektor...", opts: ["Agraris", "Ekstraktif", "Industri / Manufaktur", "Jasa", "Perdagangan"], c: 2 },
  { q: "Perusahaan telekomunikasi dan semen di Indonesia cenderung berada pada struktur pasar...", opts: ["Monopoli", "Oligopoli", "Persaingan Sempurna", "Monopsoni", "Pasar Tradisional"], c: 1 },
  { q: "Ciri khas utama pasar monopoli adalah...", opts: ["Terdapat banyak penjual", "Hanya ada satu penjual tunggal", "Barang yang dijual homogen sempurna", "Mudah keluar masuk pasar", "Harga ditentukan pembeli"], c: 1 },
  { q: "Inflasi yang disebabkan oleh kenaikan biaya produksi barang dinamakan...", opts: ["Demand-pull Inflation", "Cost-push Inflation", "Hyperinflation", "Imported Inflation", "Structural Inflation"], c: 1 },
  { q: "Kebijakan menurunkan suku bunga bank oleh Bank Sentral bertujuan untuk...", opts: ["Mengurangi jumlah uang beredar", "Mendorong pertumbuhan kredit dan kegiatan ekonomi", "Menaikkan tingkat inflasi secara drastis", "Menurunkan investasi masyarakat", "Mengurangi ekspor barang"], c: 1 },
  { q: "Anggaran APBN yang menetapkan penerimaan sama dengan pengeluaran dinamakan anggaran...", opts: ["Defisit", "Surplus", "Berimbang", "Dinamis", "Pramuka"], c: 2 },
  { q: "Perdagangan antar negara yang dilakukan untuk saling memenuhi kebutuhan barang dinamakan...", opts: ["Perdagangan Domestik", "Perdagangan Internasional", "Perdagangan Regional", "Perdagangan Antar Pulao", "Konsinyasi"], c: 1 },
  { q: "Kegiatan menjual barang ke luar negeri dengan harga murah disebut kebijakan...", opts: ["Tarif", "Kuota", "Dumping", "Subsidi", "Embargo"], c: 2 },
  { q: "Manakah yang merupakan tujuan utama penetapan tarif impor oleh pemerintah?", opts: ["Melindungi industri dalam negeri dari persaingan luar negeri", "Mendorong impor barang konsumsi", "Menurunkan pendapatan pajak negara", "Menghapuskan devisa negara", "Meningkatkan pengeluaran konsumen"], c: 0 },
  { q: "Catatan sistematis tentang transaksi ekonomi antara penduduk suatu negara dengan negara lain dinamakan...", opts: ["APBN", "Neraca Pembayaran (Balance of Payments)", "Laporan Laba Rugi", "Jurnal Umum", "Buku Besar"], c: 1 },
  { q: "Tenaga kerja yang memerlukan pendidikan formal khusus seperti dokter dan pengacara dinamakan...", opts: ["Tenaga Kerja Terampil", "Tenaga Kerja Terdidik", "Tenaga Kerja Tidak Terdidik", "Tenaga Kerja Kasar", "Tenaga Kerja Lepas"], c: 1 },
  { q: "Pengangguran yang timbul karena perubahan struktur atau sendi ekonomi suatu daerah disebut...", opts: ["Pengangguran Friksional", "Pengangguran Struktural", "Pengangguran Musiman", "Pengangguran Terselubung", "Pengangguran Siklis"], c: 1 },
  { q: "Metode pemberian balas jasa bagi tenaga kerja berdasarkan tingkat output yang dihasilkan disebut...", opts: ["Upah Waktu", "Upah Borongan / Satuan", "Upah Bonu", "Upah Co-Partnership", "Upah Skala Berubah"], c: 1 },
  { q: "Penghitungan Pendapatan Nasional dengan penjumlahan seluruh nilai tambah barang/jasa menggunakan pendekatan...", opts: ["Pendekatan Pendapatan", "Pendekatan Produksi", "Pendekatan Pengeluaran", "Pendekatan Konsumsi", "Pendekatan Tabungan"], c: 1 },
  { q: "Simpanan di bank yang penarikannya dapat dilakukan setiap saat menggunakan cek atau bilyet giro dinamakan...", opts: ["Deposito Berjangka", "Giro", "Tabungan Biasa", "Sertifikat BI", "Obligasi Negara"], c: 1 },
  { q: "Rasio perbandingan antara pendapatan total dengan jumlah penduduk suatu negara dinamakan...", opts: ["PDB Nominal", "Pendapatan Per Kapita", "Gini Ratio", "Indeks Pembangunan Manusia", "Pendapatan Nasional Bruto"], c: 1 },
  { q: "Bila pendapatan masyarakat naik dan permintaan terhadap suatu barang meningkat, barang tersebut tergolong...", opts: ["Barang Inferior", "Barang Normal", "Barang Giffen", "Barang Substitusi", "Barang Komplementer"], c: 1 },
  { q: "Dua barang yang saling melengkapi dalam penggunaannya dinamakan barang...", opts: ["Substitusi", "Komplementer", "Bebas", "Ekonomi", "Tersier"], c: 1 },
  { q: "Mentega yang dapat menggantikan minyak goreng merupakan contoh dari barang...", opts: ["Komplementer", "Substitusi", "Mewah", "Inferior", "Esensial"], c: 1 },
  { q: "Prinsip dasar ekonomi mengajarkan manusia untuk...", opts: ["Mengeluarkan modal sekecil-kecilnya untuk hasil tertentu", "Mencapai hasil sebesar-besarnya tanpa pengorbanan", "Menghabiskan seluruh pendapatan untuk konsumsi", "Menimbun barang kebutuhan pokok", "Menghindari modal dalam berproduksi"], c: 0 },
  { q: "Pasar tempat diperjualbelikannya dana-dana jangka panjang seperti saham dan obligasi dinamakan...", opts: ["Pasar Uang", "Pasar Modal (Bursa Efek)", "Pasar Valuta Asing", "Pasar Komoditas", "Pasar Barang Konsumsi"], c: 1 },
  { q: "Dokumen bukti kepemilikan modal pada suatu perseroan terbatas (PT) disebut...", opts: ["Obligasi", "Saham", "Kuitansi", "Faktur", "Warkat"], c: 1 },
  { q: "Dokumen surat utang jangka panjang yang diterbitkan oleh perusahaan atau pemerintah dinamakan...", opts: ["Saham Biasa", "Obligasi", "Bilyet Giro", "Cek", "Nota Kredit"], c: 1 },
  { q: "Dividen adalah bagian keuntungan perusahaan Perseroan Terbatas yang dibagikan kepada...", opts: ["Karyawan", "Pemegang Saham", "Pemerintah", "Direksi", "Kreditur"], c: 1 },
  { q: "Indeks harga saham gabungan di Bursa Efek Indonesia dikenal dengan singkatan...", opts: ["IHSG", "NASDAQ", "NIKKEI", "FTSE", "DOW JONES"], c: 0 }
];

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
    role TEXT NOT NULL,
    room_id INTEGER,
    nis TEXT,
    FOREIGN KEY(room_id) REFERENCES rooms(id)
  )`);

  // 3. Questions Table
  db.run(`CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subject TEXT NOT NULL,
    question_text TEXT NOT NULL,
    options TEXT NOT NULL,
    correct_answer INTEGER NOT NULL
  )`);

  // 4. Exam Sessions Table
  db.run(`CREATE TABLE IF NOT EXISTS exam_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER UNIQUE NOT NULL,
    room_id INTEGER NOT NULL,
    status TEXT DEFAULT 'IN_PROGRESS',
    violations_count INTEGER DEFAULT 0,
    answers TEXT DEFAULT '{}',
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

  // --- SEED DEMO DATA ---
  db.get("SELECT COUNT(*) as count FROM rooms", (err, row) => {
    if (row && row.count === 0) {
      console.log("Seeding Rooms...");
      const stmtRoom = db.prepare("INSERT INTO rooms (name, code) VALUES (?, ?)");
      stmtRoom.run("Ruang 01 (X MIPA 1)", "RUANG-01");
      stmtRoom.run("Ruang 02 (X MIPA 2)", "RUANG-02");
      stmtRoom.run("Lab Komputer Utama", "LAB-KOMP-1");
      stmtRoom.finalize();
    }
  });

  db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
    if (row && row.count === 0) {
      console.log("Seeding Users...");
      const stmtUser = db.prepare("INSERT INTO users (username, password, name, role, room_id, nis) VALUES (?, ?, ?, ?, ?, ?)");
      stmtUser.run("guru001@sman1mlati.sch.id", "123456", "Dra. Ani Suryani (Guru/Pengawas)", "teacher", 1, null);
      stmtUser.run("guru002@sman1mlati.sch.id", "123456", "Budi Santoso, S.Pd. (Guru/Pengawas)", "teacher", 2, null);
      stmtUser.run("operator@sman1mlati.sch.id", "admin123", "Operator CBT (Mas Yusuf)", "operator", null, null);
      stmtUser.run("siswa001@sman1mlati.sch.id", "123456", "Ahmad Fauzi", "student", 1, "20261001");
      stmtUser.run("siswa002@sman1mlati.sch.id", "123456", "Bella Anggraini", "student", 1, "20261002");
      stmtUser.run("siswa103@sman1mlati.sch.id", "123456", "Candra Wijaya", "student", 1, "20261003");
      stmtUser.run("siswa104@sman1mlati.sch.id", "123456", "Dina Mariana", "student", 1, "20261004");
      stmtUser.run("siswa105@sman1mlati.sch.id", "123456", "Eko Prasetyo", "student", 1, "20261005");
      stmtUser.run("siswa003@sman1mlati.sch.id", "123456", "Fajar Hidayat", "student", 2, "20262001");
      stmtUser.run("siswa202@sman1mlati.sch.id", "123456", "Gita Gutawa", "student", 2, "20262002");
      stmtUser.run("siswa203@sman1mlati.sch.id", "123456", "Hendra Setiawan", "student", 2, "20262003");
      stmtUser.finalize();
    }
  });

  // Seed 50 Questions
  db.get("SELECT COUNT(*) as count FROM questions", (err, row) => {
    if (!row || row.count < 50) {
      console.log("Seeding 50 Official Exam Questions...");
      db.run("DELETE FROM questions", () => {
        const stmtQ = db.prepare("INSERT INTO questions (subject, question_text, options, correct_answer) VALUES (?, ?, ?, ?)");
        questions50.forEach(item => {
          stmtQ.run("Ekonomi X", item.q, JSON.stringify(item.opts), item.c);
        });
        stmtQ.finalize();
        console.log("50 Exam Questions seeded successfully!");
      });
    }
  });

  db.get("SELECT COUNT(*) as count FROM unlock_codes", (err, row) => {
    if (row && row.count === 0) {
      db.run("INSERT INTO unlock_codes (room_id, code) VALUES (1, '849201')");
      db.run("INSERT INTO unlock_codes (room_id, code) VALUES (2, '512934')");
    }
  });

  db.run("ALTER TABLE exam_sessions ADD COLUMN battery_level INTEGER DEFAULT 100", () => {});
  db.run("ALTER TABLE exam_sessions ADD COLUMN is_charging INTEGER DEFAULT 1", () => {});
});

module.exports = db;
