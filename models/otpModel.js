const { db } = require('../config/firebase');

const otpModel = {
    // Simpan OTP ke Firestore
    saveOtp: async (email, otp) => {
        await db.collection('otps').doc(email).set({
            otp,
            expiredAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // expired 5 menit
            createdAt: new Date().toISOString(),
        });
    },

    // Ambil OTP berdasarkan email
    getOtp: async (email) => {
        const doc = await db.collection('otps').doc(email).get();
        if (!doc.exists) return null;
        return doc.data();
    },

    // Hapus OTP setelah dipakai
    deleteOtp: async (email) => {
        await db.collection('otps').doc(email).delete();
    },
};

module.exports = otpModel;