const sayurBuahList = [
    // Buah
    { nama: 'Anggur', jenis: 'Buah', kondisi: ['Mentah', 'Matang', 'Terlalu Matang', 'Busuk'], multiplier: 1.0 },
    { nama: 'Apel', jenis: 'Buah', kondisi: ['Mentah', 'Matang', 'Terlalu Matang', 'Busuk'], multiplier: 1.2 },
    { nama: 'Jeruk', jenis: 'Buah', kondisi: ['Mentah', 'Matang', 'Terlalu Matang', 'Busuk'], multiplier: 1.3 },
    { nama: 'Mangga', jenis: 'Buah', kondisi: ['Mentah', 'Matang', 'Terlalu Matang', 'Busuk'], multiplier: 0.9 },
    { nama: 'Pisang', jenis: 'Buah', kondisi: ['Mentah', 'Matang', 'Terlalu Matang', 'Busuk'], multiplier: 0.8 },

    // Sayur
    { nama: 'Cabai', jenis: 'Sayur', kondisi: ['Segar', 'Busuk'], multiplier: 1.0 },
    { nama: 'Kentang', jenis: 'Sayur', kondisi: ['Segar', 'Busuk'], multiplier: 1.4 },
    { nama: 'Mentimun', jenis: 'Sayur', kondisi: ['Segar', 'Busuk'], multiplier: 0.9 },
    { nama: 'Tomat', jenis: 'Sayur', kondisi: ['Segar', 'Busuk'], multiplier: 0.8 },
    { nama: 'Wortel', jenis: 'Sayur', kondisi: ['Segar', 'Busuk'], multiplier: 1.3 },
];

const storageMultiplier = {
    'Suhu Ruang': 1.0,
    'Pendingin': 2.0,
    'Pembeku': 4.0,
};

const baseRange = {
    'Mentah': { min: 7, max: 14 },
    'Matang': { min: 5, max: 10 },
    'Terlalu Matang': { min: 2, max: 4 },
    'Busuk': { min: 0, max: 0 },
    'Segar': { min: 5, max: 15 },
};

const itemMultiplier = {
    'Anggur': 1.0, 'Apel': 1.2, 'Jeruk': 1.3,
    'Mangga': 0.9, 'Pisang': 0.8,
    'Cabai': 1.0, 'Kentang': 1.4, 'Mentimun': 0.9,
    'Tomat': 0.8, 'Wortel': 1.3,
};

const caraSimpanDefault = {
    'Busuk': {
        cara_simpan: '- Tindakan Prioritas: Segera buang untuk menghindari kontaminasi ke bahan lain.\n- Cara Simpan: Tidak perlu disimpan – langsung buang dan bersihkan wadah penyimpanan.\n- Tips Tambahan: Bahan sudah tidak layak konsumsi.'
    },
    'Terlalu Matang': {
        cara_simpan: '- Tindakan Prioritas: Segera gunakan atau olah sebelum benar-benar busuk.\n- Cara Simpan: Simpan terpisah dari bahan lain di kulkas dan segera olah.\n- Tips Tambahan: Bahan hampir tidak layak konsumsi.'
    },
    'Segar': {
        cara_simpan: '- Tindakan Prioritas: Simpan sesuai lokasi penyimpanan yang dipilih.\n- Cara Simpan: Simpan di tempat sejuk dan kering, jauhkan dari sinar matahari langsung.\n- Tips Tambahan: Bahan dalam kondisi baik.'
    },
    'Matang': {
        cara_simpan: '- Tindakan Prioritas: Segera konsumsi atau simpan di kulkas.\n- Cara Simpan: Simpan di kulkas untuk memperpanjang kesegaran.\n- Tips Tambahan: Bahan siap dikonsumsi.'
    },
    'Mentah': {
        cara_simpan: '- Tindakan Prioritas: Simpan di tempat sejuk hingga matang.\n- Cara Simpan: Simpan di suhu ruang hingga matang, lalu pindahkan ke kulkas.\n- Tips Tambahan: Bahan masih mentah, belum siap konsumsi langsung.'
    }
};

const hitungSisaHari = (namaItem, kondisiFisik, lokasiPenyimpanan) => {
    if (kondisiFisik === 'Busuk') return 0;
    const range = baseRange[kondisiFisik];
    if (!range) return 0;
    const storage = storageMultiplier[lokasiPenyimpanan] || 1.0;
    const multiplier = itemMultiplier[namaItem] || 1.0;
    const base = Math.random() * (range.max - range.min) + range.min;
    return Math.round(base * multiplier * storage);
};

module.exports = { sayurBuahList, hitungSisaHari, storageMultiplier, caraSimpanDefault };