const express = require('express');
const router = express.Router();

// In-memory storage
let tempInventory = [];

// GET semua item sementara
router.get('/inventory', (req, res) => {
    res.json({ total: tempInventory.length, items: tempInventory });
});

// POST tambah item sementara
router.post('/inventory', (req, res) => {
    const { nama_item, kondisi_fisik, lokasi_penyimpanan, tanggal_beli } = req.body;

    if (!nama_item || !kondisi_fisik || !lokasi_penyimpanan || !tanggal_beli) {
        return res.status(400).json({ message: 'Semua field wajib diisi' });
    }

    const item = {
        id: Date.now(),
        nama_item,
        kondisi_fisik,
        lokasi_penyimpanan,
        tanggal_beli,
        createdAt: new Date().toISOString(),
    };

    tempInventory.push(item);
    res.status(201).json({ message: 'Item berhasil disimpan sementara', item });
});

// DELETE hapus item sementara
router.delete('/inventory/:id', (req, res) => {
    const id = parseInt(req.params.id);
    tempInventory = tempInventory.filter(i => i.id !== id);
    res.json({ message: 'Item berhasil dihapus' });
});

module.exports = router;