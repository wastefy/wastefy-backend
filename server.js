require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);

// Health check
app.get('/', (req, res) => {
    res.json({ message: 'Backend siap digunakan' });
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Ada masalah di server!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

