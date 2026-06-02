const { db } = require('../config/firebase');

const notificationModel = {
    // Simpan FCM token user
    saveToken: async (uid, token) => {
        await db.collection('users').doc(uid).update({
            fcmToken: token,
            tokenUpdatedAt: new Date().toISOString(),
        });
    },

    // Hapus FCM token user
    deleteToken: async (uid) => {
        await db.collection('users').doc(uid).update({
            fcmToken: null,
            tokenUpdatedAt: new Date().toISOString(),
        });
    },

    // Simpan riwayat notifikasi
    saveNotification: async (uid, data) => {
        await db.collection('notifications').add({
            uid,
            ...data,
            isRead: false,
            createdAt: new Date().toISOString(),
        });
    },

    // Ambil riwayat notifikasi user
    getHistory: async (uid) => {
        const snapshot = await db
            .collection('notifications')
            .where('uid', '==', uid)
            .orderBy('createdAt', 'desc')
            .get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    // Tandai notifikasi sudah dibaca
    markAsRead: async (id) => {
        await db.collection('notifications').doc(id).update({
            isRead: true,
            readAt: new Date().toISOString(),
        });
    },

    // Ambil FCM token user
    getToken: async (uid) => {
        const doc = await db.collection('users').doc(uid).get();
        if (!doc.exists) return null;
        return doc.data().fcmToken || null;
    },

    // Cek apakah notifikasi untuk item ini sudah ada hari ini
    existsToday: async (uid, itemId, status) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const snapshot = await db.collection('notifications')
            .where('uid', '==', uid)
            .where('itemId', '==', itemId)
            .where('status', '==', status)
            .where('createdAt', '>=', today.toISOString())
            .get();

        return !snapshot.empty;
    },
};

module.exports = notificationModel;