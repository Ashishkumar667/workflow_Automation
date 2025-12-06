"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const user_model_1 = require("../models/user.model");
const jwt_util_1 = require("../utils/jwt.util");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Register
router.post('/register', [
    (0, express_validator_1.body)('email').isEmail().normalizeEmail(),
    (0, express_validator_1.body)('password').isLength({ min: 6 }),
    (0, express_validator_1.body)('name').optional().trim(),
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
            return;
        }
        const { email, password, name } = req.body;
        // Check if user already exists
        const existingUser = await user_model_1.User.findOne({ email });
        if (existingUser) {
            res.status(409).json({ error: 'User already exists' });
            return;
        }
        // Create new user
        const user = new user_model_1.User({ email, password, name });
        await user.save();
        // Generate tokens
        const accessToken = (0, jwt_util_1.generateAccessToken)({
            userId: user._id.toString(),
            email: user.email,
        });
        const refreshToken = (0, jwt_util_1.generateRefreshToken)({
            userId: user._id.toString(),
            email: user.email,
        });
        res.status(201).json({
            message: 'User registered successfully',
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
            },
            accessToken,
            refreshToken,
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Registration failed', details: error.message });
    }
});
// Login
router.post('/login', [
    (0, express_validator_1.body)('email').isEmail().normalizeEmail(),
    (0, express_validator_1.body)('password').notEmpty(),
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
            return;
        }
        const { email, password } = req.body;
        // Find user
        const user = await user_model_1.User.findOne({ email });
        if (!user) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }
        // Check password
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }
        // Generate tokens
        const accessToken = (0, jwt_util_1.generateAccessToken)({
            userId: user._id.toString(),
            email: user.email,
        });
        const refreshToken = (0, jwt_util_1.generateRefreshToken)({
            userId: user._id.toString(),
            email: user.email,
        });
        res.json({
            message: 'Login successful',
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
            },
            accessToken,
            refreshToken,
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Login failed', details: error.message });
    }
});
// Refresh Token
router.post('/refresh', [(0, express_validator_1.body)('refreshToken').notEmpty()], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
            return;
        }
        const { refreshToken } = req.body;
        // Verify refresh token
        const payload = (0, jwt_util_1.verifyRefreshToken)(refreshToken);
        // Generate new access token
        const newAccessToken = (0, jwt_util_1.generateAccessToken)({
            userId: payload.userId,
            email: payload.email,
        });
        res.json({
            accessToken: newAccessToken,
        });
    }
    catch (error) {
        res.status(401).json({ error: 'Invalid refresh token', details: error.message });
    }
});
// Verify Token (Protected Route)
router.get('/verify', auth_middleware_1.authenticate, (req, res) => {
    res.json({
        message: 'Token is valid',
        user: req.user,
    });
});
// Get Current User (Protected Route)
router.get('/me', auth_middleware_1.authenticate, async (req, res) => {
    try {
        const user = await user_model_1.User.findById(req.user?.userId).select('-password');
        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }
        res.json({ user });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch user', details: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=auth.routes.js.map