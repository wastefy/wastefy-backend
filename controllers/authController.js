const userModel = require('../models/userModel');

const authController = {
    // Dipanggil saat user pertama kali login (register otomatis)
    registerUser: async (req, res) => {
        try {
            const { uid, email, nama } = req.body;

            await userModel.createUser(uid, {
                email,
                nama,
                createdAt: new Date().toISOString(),
            });

            res.status(201).json({ message: 'Pengguna berhasil didaftarkan' });
        } catch (error) {
            res.status(500).json({ message: 'Gagal mendaftarkan pengguna', error: error.message });
        }
    },

    // Ambil profil user yang sedang login
    getProfile: async (req, res) => {
        try {
            const user = await userModel.getUserById(req.user.uid);
            if (!user) return res.status(404).json({ message: 'Pengguna tidak ditemukan' });

            res.json(user);
        } catch (error) {
            res.status(500).json({ message: 'Gagal mengambil profil', error: error.message });
        }
    },
};

module.exports = authController;