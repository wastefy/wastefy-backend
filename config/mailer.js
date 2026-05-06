const nodemailer = require('nodemailer');

// // Konfigurasi akun Gmail pengirim menggunakan kredensial dari file .env
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
});

// Fungsi pembantu untuk mengirim email otomatis (verifikasi/reset password) ke user
const sendEmail = async (to, subject, html) => {
    try {
        await transporter.sendMail({
            from: `"Wastefy" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            html,
        });
        console.log(`Email terkirim ke ${to}`);
    } catch (error) {
        console.error('Gagal kirim email:', error.message);
        throw error;
    }
};

module.exports = { sendEmail };