import { Router } from 'express';
import rateLimit from 'express-rate-limit';

import { authController } from '../controllers/authController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

export const authRoutes = Router();

// Rate limit en login para evitar fuerza bruta
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'TOO_MANY_ATTEMPTS',
      message: 'Demasiados intentos de login. Probá de nuevo en 15 minutos.',
    },
  },
});

authRoutes.post('/register', authController.register);
authRoutes.post('/login', loginLimiter, authController.login);
authRoutes.get('/me', authMiddleware, authController.me);
