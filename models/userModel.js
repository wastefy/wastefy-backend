const { db } = require('../config/firebase');

const userModel = {
    // Simpan user baru ke Firestore
    createUser: async (uid, data) => {
        await db.collection('users').doc(uid).set(data);
    },

    // Ambil data user berdasarkan uid
    getUserById: async (uid) => {
        const doc = await db.collection('users').doc(uid).get();
        if (!doc.exists) return null;
        return { id: doc.id, ...doc.data() };
    },

    // Ambil user berdasarkan email (untuk keperluan reset password, dll)
    getUserByEmail: async (email) => {
        const snapshot = await db.collection('users').where('email', '==', email).get();
        if (snapshot.empty) return null;
        const doc = snapshot.docs[0];
        return { id: doc.id, ...doc.data() };
    },

    // Update data user
    updateUser: async (uid, data) => {
        await db.collection('users').doc(uid).update(data);
    },

    // Hapus user dari Firestore
    deleteUser: async (uid) => {
        await db.collection('users').doc(uid).delete();
    },
};

module.exports = userModel;