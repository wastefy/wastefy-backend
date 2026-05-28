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
        saran: 'Bahan sudah tidak layak konsumsi.',
        tindakan: 'Segera buang untuk menghindari kontaminasi ke bahan lain.',
        cara_simpan: 'Tidak perlu disimpan — langsung buang dan bersihkan wadah penyimpanan.',
    },
    'Terlalu Matang': {
        saran: 'Bahan hampir tidak layak konsumsi.',
        tindakan: 'Segera gunakan atau olah sebelum benar-benar busuk.',
        cara_simpan: 'Simpan terpisah dari bahan lain di kulkas dan segera olah.',
    },
    'Segar': {
        saran: 'Bahan dalam kondisi baik.',
        tindakan: 'Simpan sesuai lokasi penyimpanan yang dipilih.',
        cara_simpan: 'Simpan di tempat sejuk dan kering, jauhkan dari sinar matahari langsung.',
    },
    'Matang': {
        saran: 'Bahan siap dikonsumsi.',
        tindakan: 'Segera konsumsi atau simpan di kulkas.',
        cara_simpan: 'Simpan di kulkas untuk memperpanjang kesegaran.',
    },
    'Mentah': {
        saran: 'Bahan masih mentah, belum siap konsumsi langsung.',
        tindakan: 'Simpan di tempat sejuk hingga matang.',
        cara_simpan: 'Simpan di suhu ruang hingga matang, lalu pindahkan ke kulkas.',
    },
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