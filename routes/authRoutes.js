const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken } = require('../middleware/authMiddleware');

// Public
router.post('/register', authController.registerUser);

// Protected (harus login)
router.get('/profile', verifyToken, authController.getProfile);

module.exports = router;