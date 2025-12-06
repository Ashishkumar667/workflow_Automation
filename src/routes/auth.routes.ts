import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { User } from '../models/user.model';
import {
    generateAccessToken,
    generateRefreshToken,
    verifyRefreshToken,
} from '../utils/jwt.util';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

// Register
router.post(
    '/register',
    [
        body('email').isEmail().normalizeEmail(),
        body('password').isLength({ min: 6 }),
        body('name').optional().trim(),
    ],
    async (req: Request, res: Response): Promise<void> => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                res.status(400).json({ errors: errors.array() });
                return;
            }

            const { email, password, name } = req.body;

            // Check if user already exists
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                res.status(409).json({ error: 'User already exists' });
                return;
            }

            // Create new user
            const user = new User({ email, password, name });
            await user.save();

            // Generate tokens
            const accessToken = generateAccessToken({
                userId: user._id.toString(),
                email: user.email,
            });
            const refreshToken = generateRefreshToken({
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
        } catch (error: any) {
            res.status(500).json({ error: 'Registration failed', details: error.message });
        }
    }
);

// Login
router.post(
    '/login',
    [
        body('email').isEmail().normalizeEmail(),
        body('password').notEmpty(),
    ],
    async (req: Request, res: Response): Promise<void> => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                res.status(400).json({ errors: errors.array() });
                return;
            }

            const { email, password } = req.body;

            // Find user
            const user = await User.findOne({ email });
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
            const accessToken = generateAccessToken({
                userId: user._id.toString(),
                email: user.email,
            });
            const refreshToken = generateRefreshToken({
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
        } catch (error: any) {
            res.status(500).json({ error: 'Login failed', details: error.message });
        }
    }
);

// Refresh Token
router.post(
    '/refresh',
    [body('refreshToken').notEmpty()],
    async (req: Request, res: Response): Promise<void> => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                res.status(400).json({ errors: errors.array() });
                return;
            }

            const { refreshToken } = req.body;

            // Verify refresh token
            const payload = verifyRefreshToken(refreshToken);

            // Generate new access token
            const newAccessToken = generateAccessToken({
                userId: payload.userId,
                email: payload.email,
            });

            res.json({
                accessToken: newAccessToken,
            });
        } catch (error: any) {
            res.status(401).json({ error: 'Invalid refresh token', details: error.message });
        }
    }
);

// Verify Token (Protected Route)
router.get('/verify', authenticate, (req: AuthRequest, res: Response): void => {
    res.json({
        message: 'Token is valid',
        user: req.user,
    });
});

// Get Current User (Protected Route)
router.get('/me', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const user = await User.findById(req.user?.userId).select('-password');
        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        res.json({ user });
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to fetch user', details: error.message });
    }
});

export default router;
