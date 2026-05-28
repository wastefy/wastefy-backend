const axios = require('axios');
const FormData = require('form-data');

const AI_BASE_URL = process.env.AI_SERVICE_URL;
const AI_API_KEY = 'wastefy-unhas-2324';

const authHeader = () => ({ 'X-API-Key': AI_API_KEY });

// 1. VISION 
// POST /predict/vision
const predictVision = async (fileBuffer, mimetype) => {
    const formData = new FormData();
    formData.append('file_foto', fileBuffer, {
        filename: 'image.jpg',
        contentType: mimetype,
    });

    try {
        const response = await axios.post(
            `${AI_BASE_URL}/predict/vision`,
            formData,
            { headers: { ...formData.getHeaders(), ...authHeader() } }
        );
        const { data } = response.data;
        return {
            out_of_scope: data.out_of_scope,
            nama_item: data.name_item,
            jenis_item: data.jenis_item,
            kondisi_fisik: data.kondisi_fisik,
            confidence: data.confidence,
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
        return response.data.data.estimasi_sisa_hari;
    } catch (error) {
        _handleAIError(error, 'Regression');
    }
};

//  3. GENAI 
const predictGenai = async ({ nama_item, jenis_item, kondisi_fisik, lokasi_penyimpanan, sisa_hari }) => {
    try {
        const response = await axios.post(
            `${AI_BASE_URL}/predict/genai`,
            { nama_item, jenis_item, kondisi_fisik, lokasi_penyimpanan, sisa_hari },
            { headers: { 'Content-Type': 'application/json', ...authHeader() } }
        );
        return response.data.data;
    } catch (error) {
        // GenAI bersifat opsional — fallback ke caraSimpanDefault di controller
        console.warn('[aiService] GenAI gagal, pakai fallback:', error.message);
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

module.exports = { predictVision, predictRegression, predictGenai, determineStatus };