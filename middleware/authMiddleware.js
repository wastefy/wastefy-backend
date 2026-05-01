const { auth } = require('../config/firebase'); 

const verifyToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Akses ditolak: Token tidak disediakan' });
    }

    const token = authHeader.split(' ')[1];

    try {
        // Memakai variabel 'auth' yang sudah diinisialisasi di config
        const decoded = await auth.verifyIdToken(token);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(403).json({ message: 'Akses dilarang: Token tidak valid', error: error.message });
    }
};

module.exports = { verifyToken }; 