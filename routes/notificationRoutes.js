const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { verifyToken } = require('../middleware/authMiddleware');

// Semua route notifikasi butuh token
router.post('/token', verifyToken, notificationController.saveToken);
router.delete('/token', verifyToken, notificationController.deleteToken);
router.get('/history', verifyToken, notificationController.getHistory);
router.patch('/:id/read', verifyToken, notificationController.markAsRead);
router.post('/check', verifyToken, notificationController.checkAndNotify);

module.exports = router;