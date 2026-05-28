const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken } = require('../middleware/authMiddleware');
const { validateRegister, validateForgotPassword } = require('../middleware/validateMiddleware');

// Public
router.post('/register', validateRegister, authController.registerUser);
router.post('/forgot-password', validateForgotPassword, authController.forgotPassword);
router.post('/verify-otp', authController.verifyOtp);
router.post('/reset-password', authController.resetPassword);
router.post('/resend-verification', authController.resendVerification);

// Protected (harus login)
router.post('/login', verifyToken, authController.verifyUser);
router.post('/verify', verifyToken, authController.verifyUser);
router.get('/profile', verifyToken, authController.getProfile);
router.put('/profile', verifyToken, authController.updateProfile);
router.put('/change-password', verifyToken, authController.changePassword);
router.post('/logout', verifyToken, authController.logoutUser);
router.delete('/account', verifyToken, authController.deleteAccount);

module.exports = router;