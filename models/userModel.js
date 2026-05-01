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
};

module.exports = userModel;