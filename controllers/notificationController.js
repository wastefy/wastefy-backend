const notificationModel = require('../models/notificationModel');
const inventoryModel = require('../models/inventoryModel');
const { admin } = require('../config/firebase');

const notificationController = {

    // Simpan FCM token
    saveToken: async (req, res) => {
        try {
            const uid = req.user.uid;
            const { token } = req.body;

            if (!token) {
                return res.status(400).json({ message: 'Token tidak boleh kosong' });
            }

            await notificationModel.saveToken(uid, token);
            res.json({ message: 'Token notifikasi berhasil disimpan' });
        } catch (error) {
            res.status(500).json({ message: 'Gagal simpan token', error: error.message });
        }
    },

    // Hapus FCM token (saat logout)
    deleteToken: async (req, res) => {
        try {
            const uid = req.user.uid;
            await notificationModel.deleteToken(uid);
            res.json({ message: 'Token notifikasi berhasil dihapus' });
        } catch (error) {
            res.status(500).json({ message: 'Gagal hapus token', error: error.message });
        }
    },

    // Ambil riwayat notifikasi
    getHistory: async (req, res) => {
        try {
            const uid = req.user.uid;
            const history = await notificationModel.getHistory(uid);
            res.json({ total: history.length, history });
        } catch (error) {
            res.status(500).json({ message: 'Gagal ambil riwayat notifikasi', error: error.message });
        }
    },

    // Tandai notifikasi sudah dibaca
    markAsRead: async (req, res) => {
        try {
            const { id } = req.params;
            await notificationModel.markAsRead(id);
            res.json({ message: 'Notifikasi ditandai sudah dibaca' });
        } catch (error) {
            res.status(500).json({ message: 'Gagal update notifikasi', error: error.message });
        }
    },

    // Cek dan kirim notifikasi otomatis
    checkAndNotify: async (req, res) => {
        try {
            const uid = req.user.uid;

            // Ambil FCM token user
            const fcmToken = await notificationModel.getToken(uid);
            if (!fcmToken) {
                return res.status(200).json({ message: 'User tidak mengaktifkan notifikasi' });
            }

            // Ambil semua item aktif
            const items = await inventoryModel.getAllItems(uid);

            const soonItems = items.filter(i => i.status === 'Soon');
            const expiredItems = items.filter(i => i.status === 'Expired');

            const notifications = [];

            // Kirim notif untuk item Soon
            for (const item of soonItems) {
                const namaItem = item.nama_item || item.item_name || 'Item';
                const message = {
                    token: fcmToken,
                    notification: {
                        title: ' Segera Habiskan!',
                        body: `${namaItem} akan segera kadaluarsa dalam ${item.sisa_hari} hari`,
                    },
                    data: {
                        itemId: item.id,
                        status: 'Soon',
                        type: 'inventory',
                    },
                };

                // Simpan ke riwayat dulu (terlepas FCM berhasil atau tidak)
                const alreadySoon = await notificationModel.existsToday(uid, item.id, 'Soon');
                if (!alreadySoon) {
                    await notificationModel.saveNotification(uid, {
                        title: ' Segera Habiskan!',
                        body: `${namaItem} akan segera kadaluarsa dalam ${item.sisa_hari} hari`,
                        itemId: item.id,
                        status: 'Soon',
                    });
                }

                try {
                    await admin.messaging().send(message);
                    notifications.push({ item: namaItem, status: 'Soon', sent: true });
                } catch (err) {
                    notifications.push({ item: namaItem, status: 'Soon', sent: false, error: err.message });
                }
            }

            // Kirim notif untuk item Expired
            for (const item of expiredItems) {
                const namaItem = item.nama_item || item.item_name || 'Item';
                const message = {
                    token: fcmToken,
                    notification: {
                        title: ' Sudah Kadaluarsa!',
                        body: `${namaItem} sudah kadaluarsa, segera buang atau periksa`,
                    },
                    data: {
                        itemId: item.id,
                        status: 'Expired',
                        type: 'inventory',
                    },
                };

                // Simpan ke riwayat dulu (terlepas FCM berhasil atau tidak)
                const alreadyExpired = await notificationModel.existsToday(uid, item.id, 'Expired');
                if (!alreadyExpired) {
                    await notificationModel.saveNotification(uid, {
                        title: ' Sudah Kadaluarsa!',
                        body: `${namaItem} sudah kadaluarsa, segera buang atau periksa`,
                        itemId: item.id,
                        status: 'Expired',
                    });
                }

                try {
                    await admin.messaging().send(message);
                    notifications.push({ item: namaItem, status: 'Expired', sent: true });
                } catch (err) {
                    notifications.push({ item: namaItem, status: 'Expired', sent: false, error: err.message });
                }
            }

            res.json({
                message: 'Pengecekan notifikasi selesai',
                total_soon: soonItems.length,
                total_expired: expiredItems.length,
                notifications,
            });
        } catch (error) {
            res.status(500).json({ message: 'Gagal cek notifikasi', error: error.message });
        }
    },
};

module.exports = notificationController;