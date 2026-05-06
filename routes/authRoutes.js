const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken } = require('../middleware/authMiddleware');
const { validateRegister, validateForgotPassword } = require('../middleware/validateMiddleware');

// Public
router.post('/register', validateRegister, authController.registerUser);
router.post('/forgot-password', validateForgotPassword, authController.forgotPassword);
router.post('/resend-verification', authController.resendVerification);

// Protected (harus login)
router.post('/verify', verifyToken, authController.verifyUser);
router.get('/profile', verifyToken, authController.getProfile);
router.put('/profile', verifyToken, authController.updateProfile);
router.put('/change-password', verifyToken, authController.changePassword);
router.delete('/account', verifyToken, authController.deleteAccount);
router.post('/logout', verifyToken, authController.logoutUser);

module.exports = router;