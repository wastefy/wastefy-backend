const express = require('express');
const router = express.Router();
const { inventoryController, upload } = require('../controllers/inventoryController');
const { verifyToken } = require('../middleware/authMiddleware');

// Public
router.get('/search', inventoryController.searchItem);

// Protected
router.get('/scan-quota', verifyToken, inventoryController.getScanQuota);
router.post('/scan', verifyToken, upload.single('file_foto'), inventoryController.scanGambar);
router.get('/summary', verifyToken, inventoryController.getSummary);
router.get('/expiring', verifyToken, inventoryController.getExpiringItems);
router.post('/refresh-status', verifyToken, inventoryController.refreshStatus);
router.post('/', verifyToken, inventoryController.addItem);
router.get('/history', verifyToken, inventoryController.getHistory);
router.get('/:id', verifyToken, inventoryController.getItemById);
router.get('/', verifyToken, inventoryController.getAllItems);
router.put('/:id', verifyToken, inventoryController.updateItem);
router.patch('/:id/used', verifyToken, inventoryController.markAsUsed);
router.patch('/:id/wasted', verifyToken, inventoryController.markAsWasted);
router.patch('/:id/restore', verifyToken, inventoryController.restoreItem);
router.delete('/:id', verifyToken, inventoryController.deleteItem);

module.exports = router;