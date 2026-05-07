const userModel = require('../models/userModel');
const { admin, auth } = require('../config/firebase');
const { sendEmail } = require('../config/mailer');
const otpModel = require('../models/otpModel');

const authController = {
    // Register Manual
    registerUser: async (req, res) => {
        try {
            const { nama, email, password } = req.body;

            // Cek duplikat di Firebase Auth
            try {
                await auth.getUserByEmail(email);
                // Kalau tidak error berarti email sudah ada
                return res.status(409).json({ message: 'Email sudah terdaftar' });
            } catch (err) {
                // Kalau error 'auth/user-not-found' berarti email belum ada, lanjut
                if (err.code !== 'auth/user-not-found') {
                    throw err;
                }
            }

            // Cek apakah user sudah ada
            const existingUser = await userModel.getUserByEmail(email);
            if (existingUser) {
                return res.status(409).json({ message: 'Email sudah terdaftar' });
            }

            // Buat user di Firebase Auth
            const userRecord = await auth.createUser({
                email,
                password,
                displayName: nama,
            });

            // Simpan ke Firestore
            await userModel.createUser(userRecord.uid, {
                nama,
                email,
                isVerified: false,
                provider: 'manual',
                createdAt: new Date().toISOString(),
            });

            // Generate dan kirim link verifikasi email
            const verificationLink = await auth.generateEmailVerificationLink(email);
            await sendEmail(
                email,
                'Verifikasi Email Wastefy',
                `
                    <h2>Halo ${nama}!</h2>
                    <p>Terima kasih sudah mendaftar di Wastefy.</p>
                    <p>Klik link berikut untuk verifikasi email kamu:</p>
                    <a href="${verificationLink}">Verifikasi Email</a>
                    <p>Link ini akan kadaluarsa dalam 24 jam.</p>
                `
            );

            res.status(201).json({ message: 'Pendaftaran berhasil. Silakan cek email untuk verifikasi.' });
        } catch (error) {
            res.status(500).json({ message: 'Gagal mendaftar', error: error.message });
        }
    },

    // Verify token - dipanggil setelah frontend login (Google atau manual)
    verifyUser: async (req, res) => {
        try {
            const { uid, email, nama, email_verified } = req.user;

            // Cek status verifikasi email untuk login manual
            if (!email_verified) {
                return res.status(403).json({ message: 'Email belum diverifikasi. Silakan cek inbox email kamu.' });
            }

            // Cek apakah user sudah ada di Firestore
            let user = await userModel.getUserById(uid);

            // Kalau belum ada (login Google pertama kali)
            if (!user) {
                await userModel.createUser(uid, {
                    nama: nama || '',
                    email,
                    isVerified: true,
                    provider: 'google',
                    createdAt: new Date().toISOString(),
                });
                user = await userModel.getUserById(uid);
            }

            // Sinkronisasi status verifikasi dari Firebase Auth ke Firestore
            if (email_verified && user && !user.isVerified) {
                await userModel.updateUser(uid, { isVerified: true });
                user.isVerified = true; // Update variabel lokal agar respons Postman/HTML langsung berubah
            }

            res.json({
                message: 'Login berhasil',
                user,
            });
        } catch (error) {
            res.status(500).json({
                message: 'Gagal Verifikasi', error: error.message
            });
        }
    },

    // Forgot Password - Kirim OTP 
    forgotPassword: async (req, res) => {
        try {
            const { email } = req.body;

            // Cek apakah email terdaftar
            const user = await userModel.getUserByEmail(email);
            if (!user) {
                return res.status(404).json({ message: 'Email tidak ditemukan' });
            }

            // Generate OTP 4 digit
            const otp = Math.floor(1000 + Math.random() * 9000).toString();

            // Simpan OTP ke Firestore
            await otpModel.saveOtp(email, otp);

            // Kirim OTP ke email
            await sendEmail(
                email,
                'Kode OTP Reset Password Wastefy',
                `
                    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto;">
                        <h2>Reset Password</h2>
                        <p>Gunakan kode OTP berikut untuk reset password kamu:</p>
                        <div style="font-size: 36px; font-weight: bold; letter-spacing: 10px; 
                                text-align: center; padding: 20px; background: #f5f5f5; 
                                border-radius: 8px; margin: 20px 0;">
                        ${otp}
                    </div>
                    <p style="color: gray; font-size: 12px;">
                        Kode ini akan kadaluarsa dalam 5 menit.<br/>
                        Jika kamu tidak meminta ini, abaikan email ini.
                    </p>
                </div>
                `
            );

            res.json({ message: 'Kode OTP telah dikirim ke email kamu' });
        } catch (error) {
            res.status(500).json({
                message: 'Gagal mengirim OTP',
                error: error.message
            });
        }
    },

    // Verify OTP
    verifyOtp: async (req, res) => {
        try {
            const { email, otp } = req.body;

            // Ambil OTP dari Firestore
            const otpData = await otpModel.getOtp(email);
            if (!otpData) {
                return res.status(400).json({ message: 'OTP tidak ditemukan, silahkan request ulang' });
            }

            // Cek apakah OTP sudah expired
            if (new Date() > new Date(otpData.expiredAt)) {
                await otpModel.deleteOtp(email); // Hapus OTP yang sudah expired
                return res.status(400).json({ message: 'OTP sudah kadaluarsa, silahkan request ulang' });
            }

            // Cek apakah OTP cocok
            if (otp !== otpData.otp) {
                return res.status(400).json({ message: 'OTP tidak valid' });
            }

            // OTP valid, hapus OTP dari Firestore
            await otpModel.deleteOtp(email);
            res.json({ message: 'OTP valid, silakan buat password baru' });
        } catch (error) {
            res.status(500).json({ message: 'Gagal verifikasi OTP', error: error.message });
        }
    },

    // Reset Password setelah OTP terverifikasi
    // Reset Password setelah OTP verified
    resetPassword: async (req, res) => {
        try {
            const { email, newPassword } = req.body;

            if (!newPassword || newPassword.length < 6) {
                return res.status(400).json({ message: 'Password minimal 6 karakter' });
            }

            // Update password di Firebase Auth
            const userRecord = await auth.getUserByEmail(email);
            await auth.updateUser(userRecord.uid, { password: newPassword });

            res.json({ message: 'Password berhasil direset' });
        } catch (error) {
            res.status(500).json({ message: 'Gagal reset password', error: error.message });
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

    // Update profil
    updateProfile: async (req, res) => {
        try {
            const { nama } = req.body;
            if (!nama) {
                return res.status(400).json({ message: 'Nama tidak boleh kosong' });
            }
            await userModel.updateUser(req.user.uid, { nama });
            res.json({ message: 'Profil berhasil diupdate' });
        } catch (error) {
            res.status(500).json({ message: 'Gagal update profil', error: error.message });
        }
    },

    // Hapus akun
    deleteAccount: async (req, res) => {
        try {
            const uid = req.user.uid;
            await auth.deleteUser(uid);
            await userModel.deleteUser(uid);
            res.json({ message: 'Akun berhasil dihapus' });
        } catch (error) {
            res.status(500).json({ message: 'Gagal hapus akun', error: error.message });
        }
    },

    // Logout - revoke token
    logoutUser: async (req, res) => {
        try {
            await auth.revokeRefreshTokens(req.user.uid);
            res.json({ message: 'Logout berhasil' });
        } catch (error) {
            res.status(500).json({ message: 'Gagal logout', error: error.message });
        }
    },

    // Resend verification email
    resendVerification: async (req, res) => {
        try {
            const { email } = req.body;

            const user = await userModel.getUserByEmail(email);
            if (!user) {
                return res.status(404).json({ message: 'Email tidak ditemukan' });
            }

            const verificationLink = await auth.generateEmailVerificationLink(email);
            await sendEmail(
                email,
                'Verifikasi Email Wastefy',
                `
                    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto;">
                        <h2>Verifikasi Email Kamu</h2>
                        <p>Klik tombol berikut untuk verifikasi email kamu:</p>
                        <a href="${verificationLink}" 
                           style="background:#4CAF50; color:white; padding:10px 20px; 
                                  text-decoration:none; border-radius:5px;">
                            Verifikasi Email
                        </a>
                        <p style="margin-top:20px; color:gray; font-size:12px;">
                            Link ini akan kadaluarsa dalam 24 jam.
                        </p>
                    </div>
                `
            );

            res.json({ message: 'Link verifikasi telah dikirim ulang ke email kamu' });
        } catch (error) {
            res.status(500).json({ message: 'Gagal kirim ulang verifikasi', error: error.message });
        }
    },

    // Change password
    changePassword: async (req, res) => {
        try {
            const { newPassword } = req.body;

            if (!newPassword || newPassword.length < 6) {
                return res.status(400).json({ message: 'Password baru minimal 6 karakter' });
            }

            await auth.updateUser(req.user.uid, { password: newPassword });
            res.json({ message: 'Password berhasil diubah' });
        } catch (error) {
            res.status(500).json({ message: 'Gagal mengubah password', error: error.message });
        }
    },
};

module.exports = authController;