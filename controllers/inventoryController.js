const inventoryModel = require('../models/inventoryModel');
const { predictVision, predictRegression, predictGenai, determineStatus, validateInput } = require('../services/aiService');
const { sayurBuahList, hitungSisaHari, caraSimpanDefault } = require('../data/sayurBuah');
const { db } = require('../config/firebase');
const multer = require('multer');

// Multer: validasi format & ukuran file
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/jpg', 'image/png'];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Format file tidak didukung. Gunakan JPEG, JPG, atau PNG'));
        }
    },
});

// Helper: cek kuota scan harian
const cekLimitScan = async (uid) => {
    const today = new Date().toISOString().split('T')[0];
    const doc = await db.collection('scan_quota').doc(uid).get();
    if (!doc.exists || doc.data().date !== today) return { allowed: true, remaining: 5 };
    const remaining = 5 - (doc.data().count || 0);
    return { allowed: remaining > 0, remaining };
};

// Helper: tambah count scan
const tambahCountScan = async (uid) => {
    const today = new Date().toISOString().split('T')[0];
    const ref = db.collection('scan_quota').doc(uid);
    const doc = await ref.get();
    if (!doc.exists || doc.data().date !== today) {
        await ref.set({ date: today, count: 1 });
        return 1;
    }
    const newCount = (doc.data().count || 0) + 1;
    await ref.update({ count: newCount });
    return newCount;
};

const inventoryController = {

    // Search sayur/buah (untuk dropdown dengan search)
    searchItem: async (req, res) => {
        try {
            const { q } = req.query;
            if (!q) return res.status(400).json({ message: 'Query tidak boleh kosong' });
            const results = sayurBuahList
                .filter(item => item.nama.toLowerCase().includes(q.toLowerCase()))
                .map(item => ({ nama: item.nama, jenis: item.jenis, kondisi: item.kondisi }));
            res.json({ results });
        } catch (error) {
            res.status(500).json({ message: 'Gagal mencari item', error: error.message });
        }
    },

    // Cek sisa kuota scan harian
    getScanQuota: async (req, res) => {
        try {
            const uid = req.user.uid;
            const today = new Date().toISOString().split('T')[0];
            const doc = await db.collection('scan_quota').doc(uid).get();
            if (!doc.exists || doc.data().date !== today) {
                return res.json({ used: 0, remaining: 5, limit: 5 });
            }
            const used = doc.data().count || 0;
            res.json({ used, remaining: 5 - used, limit: 5 });
        } catch (error) {
            res.status(500).json({ message: 'Gagal cek kuota scan', error: error.message });
        }
    },

    // Scan gambar
    // Alur: cek limit -> validasi file -> vision AI -> tambah count -> cek out_of_scope -> busuk bypass -> regression + genai
    scanGambar: async (req, res) => {
        try {
            const uid = req.user.uid;

            // 1. Cek limit scan 5x/hari
            const quota = await cekLimitScan(uid);
            if (!quota.allowed) {
                return res.status(429).json({
                    message: 'Batas scan harian (5x) sudah tercapai. Coba lagi besok atau isi manual.',
                    remaining: 0,
                });
            }

            // 2. Validasi file ada
            if (!req.file) {
                return res.status(400).json({ message: 'Gambar tidak boleh kosong' });
            }

            // 3. Panggil AI Vision
            const result = await predictVision(req.file.buffer, req.file.mimetype);

            // 4. Tambah count scan (dihitung meski out_of_scope)
            const newCount = await tambahCountScan(uid);
            const remaining_scan = 5 - newCount;

            // 5. Cek out of scope
            if (result.out_of_scope === true || !result.nama_item) {
                return res.status(422).json({
                    out_of_scope: true,
                    message: 'Bahan tidak dikenali, silakan pilih manual',
                    remaining_scan,
                });
            }

            // Data pendukung lokal
            const itemData = sayurBuahList.find(
                i => i.nama.toLowerCase() === result.nama_item.toLowerCase()
            );
            const lokasi_default = 'Pendingin';
            const tanggal_default = new Date().toISOString().split('T')[0];

            // 6. Logika khusus busuk: bypass semua AI model
            if (result.kondisi_fisik === 'Busuk') {
                const caraSimpan = caraSimpanDefault['Busuk'];
                return res.json({
                    out_of_scope: false,
                    message: 'Gambar berhasil dianalisis',
                    remaining_scan,
                    data: {
                        nama_item: result.nama_item,
                        jenis_item: itemData ? itemData.jenis : result.jenis_item,
                        kondisi_fisik: 'Busuk',
                        kondisi_options: itemData ? itemData.kondisi : [],
                        lokasi_penyimpanan: lokasi_default,
                        tanggal_beli: tanggal_default,
                        tanggal_catat: tanggal_default,
                        sisa_hari: 0,
                        status: 'Expired',
                        cara_simpan: caraSimpan.cara_simpan,
                    },
                });
            }

            // 7. Normal flow: panggil AI Regression dan GenAI
            const sisa_hari = await predictRegression({
                nama_item: result.nama_item,
                jenis_item: result.jenis_item,
                kondisi_fisik: result.kondisi_fisik,
                lokasi_penyimpanan: lokasi_default,
                tanggal_beli: tanggal_default,
            });

            const genaiResult = await predictGenai({
                nama_item: result.nama_item,
                jenis_item: result.jenis_item,
                kondisi_fisik: result.kondisi_fisik,
                lokasi_penyimpanan: lokasi_default,
                sisa_hari,
            });

            const status = determineStatus(sisa_hari);
            const caraSimpan = caraSimpanDefault[result.kondisi_fisik] || caraSimpanDefault['Segar'];

            res.json({
                out_of_scope: false,
                message: 'Gambar berhasil dianalisis',
                remaining_scan,
                data: {
                    nama_item: result.nama_item,
                    jenis_item: itemData ? itemData.jenis : result.jenis_item,
                    kondisi_fisik: result.kondisi_fisik,
                    kondisi_options: itemData ? itemData.kondisi : [],
                    lokasi_penyimpanan: lokasi_default,
                    tanggal_beli: tanggal_default,
                    tanggal_catat: tanggal_default,
                    sisa_hari,
                    status,
                    cara_simpan: genaiResult?.cara_simpan || caraSimpan.cara_simpan,
                },
            });

        } catch (error) {
            res.status(500).json({ message: 'Gagal scan gambar', error: error.message });
        }
    },

    // Tambah item baru
    // Regression dan GenAI dipanggil saat tombol "tambah stok" ditekan
    addItem: async (req, res) => {
        try {
            const uid = req.user.uid;
            const { nama_item, kondisi_fisik, lokasi_penyimpanan, tanggal_beli } = req.body;

            // Validasi filter input sesuai daftar valid AI service
            const filterErrors = validateInput({ nama_item, kondisi_fisik, lokasi_penyimpanan });
            if (filterErrors.length > 0) {
                return res.status(400).json({ message: filterErrors[0] });
            }

            // Validasi urutan: nama_item harus ada sebelum kondisi_fisik
            if (!nama_item && kondisi_fisik) {
                return res.status(400).json({
                    message: 'nama_item harus diisi terlebih dahulu sebelum kondisi_fisik',
                });
            }

            // Validasi field wajib
            if (!nama_item || !kondisi_fisik || !lokasi_penyimpanan) {
                return res.status(400).json({
                    message: 'nama_item, kondisi_fisik, dan lokasi_penyimpanan wajib diisi',
                });
            }

            // Cek nama_item di kamus lokal
            const itemData = sayurBuahList.find(
                i => i.nama.toLowerCase() === nama_item.toLowerCase()
            );
            if (!itemData) {
                return res.status(400).json({ message: 'nama_item tidak ditemukan di database' });
            }

            // Validasi kondisi_fisik sesuai jenis item
            if (!itemData.kondisi.includes(kondisi_fisik)) {
                return res.status(400).json({
                    message: `kondisi_fisik untuk ${itemData.jenis} harus: ${itemData.kondisi.join(', ')}`,
                });
            }

            // Logika khusus busuk: bypass AI, sisa_hari = 0, status Expired langsung
            if (kondisi_fisik === 'Busuk') {
                const caraSimpan = caraSimpanDefault['Busuk'];
                const item = {
                    nama_item,
                    jenis_item: itemData.jenis,
                    kondisi_fisik,
                    lokasi_penyimpanan,
                    tanggal_beli: tanggal_beli || null,
                    tanggal_catat: new Date().toISOString().split('T')[0],
                    sisa_hari: 0,
                    status: 'Expired',
                    isArchived: false,
                    cara_simpan: caraSimpan.cara_simpan,
                };
                const itemId = await inventoryModel.addItem(uid, item);
                return res.status(201).json({
                    message: 'Item berhasil ditambahkan',
                    itemId,
                    item,
                });
            }

            // Normal flow: panggil Regression dan GenAI saat konfirmasi tambah stok
            const tanggal = tanggal_beli || new Date().toISOString().split('T')[0];
            const sisa_hari = await predictRegression({
                nama_item,
                jenis_item: itemData.jenis,
                kondisi_fisik,
                lokasi_penyimpanan,
                tanggal_beli: tanggal,
            });

            const genaiResult = await predictGenai({
                nama_item,
                jenis_item: itemData.jenis,
                kondisi_fisik,
                lokasi_penyimpanan,
                sisa_hari,
            });

            const status = determineStatus(sisa_hari);
            const caraSimpan = caraSimpanDefault[kondisi_fisik] || caraSimpanDefault['Segar'];

            const item = {
                nama_item,
                jenis_item: itemData.jenis,
                kondisi_fisik,
                lokasi_penyimpanan,
                tanggal_beli: tanggal_beli || null,
                tanggal_catat: new Date().toISOString().split('T')[0],
                sisa_hari,
                status,
                isArchived: false,
                cara_simpan: genaiResult?.cara_simpan || caraSimpan.cara_simpan,
            };

            const itemId = await inventoryModel.addItem(uid, item);
            res.status(201).json({ message: 'Item berhasil ditambahkan', itemId, item });

        } catch (error) {
            res.status(500).json({ message: 'Gagal menambah item', error: error.message });
        }
    },

    // Lihat semua item
    getAllItems: async (req, res) => {
        try {
            const uid = req.user.uid;
            const { status } = req.query;
            const items = status
                ? await inventoryModel.getItemsByStatus(uid, status)
                : await inventoryModel.getAllItems(uid);
            res.json({ total: items.length, items });
        } catch (error) {
            res.status(500).json({ message: 'Gagal ambil data inventory', error: error.message });
        }
    },

    // Get item by ID
    getItemById: async (req, res) => {
        try {
            const { id } = req.params;
            const uid = req.user.uid;
            const item = await inventoryModel.getItemById(id);
            if (!item) return res.status(404).json({ message: 'Item tidak ditemukan' });
            if (item.uid !== uid) return res.status(403).json({ message: 'Akses ditolak' });
            res.json(item);
        } catch (error) {
            res.status(500).json({ message: 'Gagal ambil item', error: error.message });
        }
    },

    // Edit item (hanya untuk koreksi input)
    // Validasi urutan sama: nama_item harus ada sebelum kondisi_fisik
    updateItem: async (req, res) => {
        try {
            const { id } = req.params;
            const uid = req.user.uid;
            const { nama_item, kondisi_fisik, lokasi_penyimpanan, tanggal_beli } = req.body;

            const item = await inventoryModel.getItemById(id);
            if (!item) return res.status(404).json({ message: 'Item tidak ditemukan' });
            if (item.uid !== uid) return res.status(403).json({ message: 'Akses ditolak' });
            if (item.isArchived) return res.status(400).json({ message: 'Item sudah diarsipkan, tidak bisa diedit' });

            // Validasi urutan
            if (!nama_item && kondisi_fisik) {
                return res.status(400).json({
                    message: 'nama_item harus diisi terlebih dahulu sebelum kondisi_fisik',
                });
            }

            const updateData = {};

            if (nama_item) {
                const itemData = sayurBuahList.find(i => i.nama.toLowerCase() === nama_item.toLowerCase());
                if (!itemData) return res.status(400).json({ message: 'nama_item tidak ditemukan di database' });
                updateData.nama_item = nama_item;
                updateData.jenis_item = itemData.jenis;
            }

            if (kondisi_fisik || lokasi_penyimpanan) {
                const finalNama = nama_item || item.nama_item;
                const finalKondisi = kondisi_fisik || item.kondisi_fisik;
                const finalLokasi = lokasi_penyimpanan || item.lokasi_penyimpanan;

                const itemData = sayurBuahList.find(i => i.nama.toLowerCase() === finalNama.toLowerCase());

                if (kondisi_fisik && itemData && !itemData.kondisi.includes(kondisi_fisik)) {
                    return res.status(400).json({ message: `kondisi_fisik harus: ${itemData.kondisi.join(', ')}` });
                }
                if (lokasi_penyimpanan && !['Suhu Ruang', 'Pendingin', 'Pembeku'].includes(lokasi_penyimpanan)) {
                    return res.status(400).json({ message: 'lokasi_penyimpanan harus: Suhu Ruang, Pendingin, atau Pembeku' });
                }

                // Logika busuk saat edit
                if (finalKondisi === 'Busuk') {
                    const caraSimpan = caraSimpanDefault['Busuk'];
                    Object.assign(updateData, {
                        kondisi_fisik: finalKondisi,
                        lokasi_penyimpanan: finalLokasi,
                        sisa_hari: 0,
                        status: 'Expired',
                        cara_simpan: caraSimpan.cara_simpan,
                    });
                } else {
                    // Panggil AI Regression dan GenAI untuk data terbaru
                    const sisa_hari = await predictRegression({
                        nama_item: finalNama,
                        jenis_item: itemData ? itemData.jenis : item.jenis_item,
                        kondisi_fisik: finalKondisi,
                        lokasi_penyimpanan: finalLokasi,
                        tanggal_beli: tanggal_beli || item.tanggal_beli || new Date().toISOString().split('T')[0],
                    });

                    const genaiResult = await predictGenai({
                        nama_item: finalNama,
                        jenis_item: itemData ? itemData.jenis : item.jenis_item,
                        kondisi_fisik: finalKondisi,
                        lokasi_penyimpanan: finalLokasi,
                        sisa_hari,
                    });

                    const caraSimpan = caraSimpanDefault[finalKondisi] || caraSimpanDefault['Segar'];
                    Object.assign(updateData, {
                        kondisi_fisik: finalKondisi,
                        lokasi_penyimpanan: finalLokasi,
                        sisa_hari,
                        status: determineStatus(sisa_hari),
                        cara_simpan: genaiResult?.cara_simpan || caraSimpan.cara_simpan,
                    });
                }
            }

            if (tanggal_beli) updateData.tanggal_beli = tanggal_beli;

            await inventoryModel.updateItem(id, updateData);
            res.json({ message: 'Item berhasil diupdate' });
        } catch (error) {
            res.status(500).json({ message: 'Gagal update item', error: error.message });
        }
    },

    // Tandai terpakai
    markAsUsed: async (req, res) => {
        try {
            const { id } = req.params;
            const uid = req.user.uid;
            const item = await inventoryModel.getItemById(id);
            if (!item) return res.status(404).json({ message: 'Item tidak ditemukan' });
            if (item.uid !== uid) return res.status(403).json({ message: 'Akses ditolak' });
            if (item.isArchived) return res.status(400).json({ message: `Item sudah ditandai sebagai ${item.archiveAction}` });
            await inventoryModel.archiveItem(id, 'terpakai', item.sisa_hari);
            res.json({ message: 'Item ditandai sebagai terpakai' });
        } catch (error) {
            res.status(500).json({ message: 'Gagal update status', error: error.message });
        }
    },

    // Tandai buang
    markAsWasted: async (req, res) => {
        try {
            const { id } = req.params;
            const uid = req.user.uid;
            const item = await inventoryModel.getItemById(id);
            if (!item) return res.status(404).json({ message: 'Item tidak ditemukan' });
            if (item.uid !== uid) return res.status(403).json({ message: 'Akses ditolak' });
            if (item.isArchived) return res.status(400).json({ message: `Item sudah ditandai sebagai ${item.archiveAction}` });
            await inventoryModel.archiveItem(id, 'buang', item.sisa_hari);
            res.json({ message: 'Item ditandai sebagai terbuang' });
        } catch (error) {
            res.status(500).json({ message: 'Gagal update status', error: error.message });
        }
    },

    // Kembalikan ke stok (hanya item wasted yang bisa)
    restoreItem: async (req, res) => {
        try {
            const { id } = req.params;
            const uid = req.user.uid;
            const item = await inventoryModel.getItemById(id);
            if (!item) return res.status(404).json({ message: 'Item tidak ditemukan' });
            if (item.uid !== uid) return res.status(403).json({ message: 'Akses ditolak' });
            if (item.archiveAction === 'terpakai') {
                return res.status(400).json({ message: 'Item yang sudah terpakai tidak bisa dikembalikan ke stok' });
            }
            if (!item.isArchived) return res.status(400).json({ message: 'Item masih di stok' });

            // Busuk tetap 0, non-busuk hitung ulang lokal
            const sisa_hari = hitungSisaHari(item.nama_item, item.kondisi_fisik, item.lokasi_penyimpanan);
            const status = determineStatus(sisa_hari);
            const caraSimpan = caraSimpanDefault[item.kondisi_fisik] || caraSimpanDefault['Segar'];

            await inventoryModel.updateItem(id, {
                isArchived: false,
                archiveAction: null,
                archivedAt: null,
                sisaHariSaatArsip: null,
                sisa_hari,
                status,
                tanggal_catat: new Date().toISOString().split('T')[0],
                cara_simpan: caraSimpan.cara_simpan,
            });

            res.json({ message: 'Item berhasil dikembalikan ke stok' });
        } catch (error) {
            res.status(500).json({ message: 'Gagal kembalikan item', error: error.message });
        }
    },

    // Lihat riwayat
    getHistory: async (req, res) => {
        try {
            const uid = req.user.uid;
            const { action } = req.query;
            const history = action
                ? await inventoryModel.getHistoryByAction(uid, action)
                : await inventoryModel.getHistory(uid);
            res.json({ total: history.length, history });
        } catch (error) {
            res.status(500).json({ message: 'Gagal ambil riwayat', error: error.message });
        }
    },

    // Summary dashboard
    getSummary: async (req, res) => {
        try {
            const uid = req.user.uid;
            const summary = await inventoryModel.getSummary(uid);
            res.json(summary);
        } catch (error) {
            res.status(500).json({ message: 'Gagal ambil summary', error: error.message });
        }
    },

    // Ambil item expiring soon
    getExpiringItems: async (req, res) => {
        try {
            const uid = req.user.uid;
            const items = await inventoryModel.getExpiringItems(uid);
            res.json({ total: items.length, items });
        } catch (error) {
            res.status(500).json({ message: 'Gagal ambil item expiring', error: error.message });
        }
    },

    // Refresh status semua item berdasarkan selisih tanggal_catat
    // Item busuk di-skip karena status Expired permanen
    refreshStatus: async (req, res) => {
        try {
            const uid = req.user.uid;
            const items = await inventoryModel.getAllItemsForRefresh(uid);
            let updated = 0;

            for (const item of items) {
                if (item.kondisi_fisik === 'Busuk') continue;
                const tanggalCatat = new Date(item.tanggal_catat);
                const today = new Date();
                const daysPassed = Math.floor((today - tanggalCatat) / (1000 * 60 * 60 * 24));
                const sisaHariBaru = Math.max(0, item.sisa_hari - daysPassed);
                const newStatus = determineStatus(sisaHariBaru);
                if (newStatus !== item.status || sisaHariBaru !== item.sisa_hari) {
                    await inventoryModel.updateItem(item.id, { sisa_hari: sisaHariBaru, status: newStatus });
                    updated++;
                }
            }

            res.json({ message: 'Status berhasil direfresh', updated });
        } catch (error) {
            res.status(500).json({ message: 'Gagal refresh status', error: error.message });
        }
    },

    // Hapus item permanen
    deleteItem: async (req, res) => {
        try {
            const { id } = req.params;
            const uid = req.user.uid;
            const item = await inventoryModel.getItemById(id);
            if (!item) return res.status(404).json({ message: 'Item tidak ditemukan' });
            if (item.uid !== uid) return res.status(403).json({ message: 'Akses ditolak' });
            await inventoryModel.deleteItem(id);
            res.json({ message: 'Item berhasil dihapus' });
        } catch (error) {
            res.status(500).json({ message: 'Gagal hapus item', error: error.message });
        }
    },
};

module.exports = { inventoryController, upload };