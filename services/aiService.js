const axios = require('axios');
const FormData = require('form-data');

const AI_BASE_URL = process.env.AI_SERVICE_URL;
const AI_API_KEY = 'wastefy-unhas-2324';

const authHeader = () => ({ 'X-API-Key': AI_API_KEY });

// Validasi filter sesuai AI service
const VALID_ITEM = ['Anggur', 'Apel', 'Cabai', 'Jeruk', 'Kentang', 'Mangga', 'Mentimun', 'Pisang', 'Tomat', 'Wortel'];
const VALID_JENIS = ['Buah', 'Sayur'];
const VALID_KONDISI = ['Busuk', 'Matang', 'Mentah', 'Terlalu Matang', 'Segar'];
const VALID_LOKASI = ['Suhu Ruang', 'Pendingin', 'Pembeku'];


// 1. VISION 
const predictVision = async (fileBuffer, mimetype) => {
    const formData = new FormData();
    const safeMimetype = mimetype || 'image/jpeg';
    const extension = safeMimetype === 'image/png' ? 'png' : 'jpg';
    formData.append('file_foto', fileBuffer, {
        filename: `scan_image.${extension}`,
        contentType: safeMimetype,
    });

    try {
        const response = await axios.post(
            `${AI_BASE_URL}/predict/vision`,
            formData,
            { headers: { ...formData.getHeaders(), ...authHeader() } }
        );
        const aiResult = response.data.data;
        return {
            out_of_scope: aiResult.out_of_scope,
            nama_item: aiResult.nama_item,
            jenis_item: aiResult.jenis_item,
            kondisi_fisik: aiResult.kondisi_fisik,
            confidence: aiResult.confidence,
        };
    } catch (error) {
        _handleAIError(error, 'Vision');
    }
};

// 2. REGRESSION 
const predictRegression = async ({ nama_item, jenis_item, kondisi_fisik, lokasi_penyimpanan, tanggal_beli }) => {
    try {
        const response = await axios.post(
            `${AI_BASE_URL}/predict/regression`,
            { nama_item, jenis_item, kondisi_fisik, lokasi_penyimpanan, tanggal_beli },
            { headers: { 'Content-Type': 'application/json', ...authHeader() } }
        );
        const raw = response.data.data.sisa_hari;
        // Cap 0-40
        return Math.min(40, Math.max(0, raw));
    } catch (error) {
        _handleAIError(error, 'Regression');
    }
};

//  3. GENAI 
const parseGenaiResponse = (data) => {
    if (!data) return null;

    // Tentukan string mentah (raw) untuk di-parse jika isi data berupa string gabungan
    let raw = '';
    if (typeof data === 'object') {
        raw = data.cara_simpan || data.tindakan || data.saran || data.tips_tambahan || JSON.stringify(data);
    } else {
        raw = typeof data === 'string' ? data : JSON.stringify(data);
    }

    // Fungsi Regex pencari baris teks berdasarkan label tanda minus (-) dari AI Python
    const extract = (label, nextLabels) => {
        const pattern = new RegExp(`-\\s*${label}:\\s*([\\s\\S]*?)(?=${nextLabels.map(l => `-\\s*${l}:`).join('|')}|$)`, 'i');
        const match = raw.match(pattern);
        return match ? match[1].trim() : '';
    };

    // Eksekusi pemotongan string string berdasarkan pola spasi / baris baru (\n)
    const tindakanPecah = extract('Tindakan Prioritas', ['Cara Simpan', 'Tips Tambahan', 'Saran']);
    const caraSimpanPecah = extract('Cara Simpan', ['Tips Tambahan', 'Tindakan Prioritas', 'Saran']);
    const saranPecah = extract('Tips Tambahan', ['Cara Simpan', 'Tindakan Prioritas']) || extract('Saran', ['Cara Simpan', 'Tindakan Prioritas']);

    if (tindakanPecah || caraSimpanPecah || saranPecah) {
        return {
            tindakan: tindakanPecah,
            cara_simpan: caraSimpanPecah,
            saran: saranPecah
        };
    }

    if (typeof data === 'object' && data.cara_simpan && !data.cara_simpan.includes('- ')) {
        return {
            tindakan: data.tindakan || '',
            cara_simpan: data.cara_simpan || '',
            saran: data.saran || data.tips_tambahan || '',
        };
    }

    return null;
};

// Request API ke Server GenAI (/predict/genai)
const predictGenai = async ({ nama_item, jenis_item, kondisi_fisik, lokasi_penyimpanan, sisa_hari }) => {
    try {
        const response = await axios.post(
            `${AI_BASE_URL}/predict/genai`,
            { nama_item, jenis_item, kondisi_fisik, lokasi_penyimpanan, sisa_hari },
            { headers: { 'Content-Type': 'application/json', ...authHeader() } }
        );

        return parseGenaiResponse(response.data.data);
    } catch (error) {
        // Fallback otomatis memicu caraSimpanDefault lokal jika server GenAI RTO/Down
        console.warn('[aiService] GenAI gagal, pakai fallback lokal:', error.message);
        return null;
    }
};

//  Status berdasarkan sisa hari 
// Fresh   = sisa_hari > 3
// Soon    = sisa_hari > 0 && <= 3
// Expired = sisa_hari <= 0
const determineStatus = (sisaHari) => {
    if (sisaHari > 3) return 'Fresh';
    if (sisaHari > 0) return 'Soon';
    return 'Expired';
};

//  Validasi filter input 
const validateInput = ({ nama_item, jenis_item, kondisi_fisik, lokasi_penyimpanan }) => {
    const errors = [];
    if (nama_item && !VALID_ITEM.includes(nama_item)) errors.push(`nama_item tidak valid. Pilihan: ${VALID_ITEM.join(', ')}`);
    if (jenis_item && !VALID_JENIS.includes(jenis_item)) errors.push(`jenis_item tidak valid. Pilihan: ${VALID_JENIS.join(', ')}`);
    if (kondisi_fisik && !VALID_KONDISI.includes(kondisi_fisik)) errors.push(`kondisi_fisik tidak valid. Pilihan: ${VALID_KONDISI.join(', ')}`);
    if (lokasi_penyimpanan && !VALID_LOKASI.includes(lokasi_penyimpanan)) errors.push(`lokasi_penyimpanan tidak valid. Pilihan: ${VALID_LOKASI.join(', ')}`);
    return errors;
};

//  Error handler terpusat 
const _handleAIError = (error, label) => {
    const status = error.response?.status;
    const body = error.response?.data;

    if (status === 401) throw new Error(`[AI ${label}] API Key tidak valid atau tidak ada`);
    if (status === 422) {
        const pesan = body?.errors?.[0]?.message || JSON.stringify(body);
        throw new Error(`[AI ${label}] Validasi gagal: ${pesan}`);
    }
    if (status === 500) throw new Error(`[AI ${label}] Kesalahan internal pada AI service`);
    throw new Error(`[AI ${label}] Error: ${error.message}`);
};

module.exports = {
    predictVision,
    predictRegression,
    predictGenai,
    determineStatus,
    validateInput,
    parseGenaiResponse,
    VALID_ITEM, VALID_JENIS, VALID_KONDISI, VALID_LOKASI,
};