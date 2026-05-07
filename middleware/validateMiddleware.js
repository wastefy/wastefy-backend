const { body, validationResult } = require('express-validator');

const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

// validasi register manual
const validateRegister = [
    body('nama').notEmpty().withMessage('Nama tidak boleh kosong'),
    body('email').isEmail().withMessage('Format email tidak valid'),
    body('password').isLength({ min: 6 }).withMessage('Password minimal 6 karakter'),
    validate,
];

// Validasi forgot password
const validateForgotPassword = [
    body('email').isEmail().withMessage('Format email tidak valid'),
    validate,
];

const validateVerifyOtp = [
    body('email').isEmail().withMessage('Format email tidak valid'),
    body('otp').isLength({ min: 4, max: 4 }).withMessage('OTP harus 4 digit'),
    validate,
];

const validateResetPassword = [
    body('email').isEmail().withMessage('Format email tidak valid'),
    body('newPassword').isLength({ min: 6 }).withMessage('Password minimal 6 karakter'),
    validate,
];

module.exports = { validateRegister, validateForgotPassword, validateVerifyOtp, validateResetPassword };