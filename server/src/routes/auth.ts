import { Router } from 'express';
import { dbService, hashPassword, verifyPassword } from '../db/index.js';
import { authenticateUser } from '../middleware/auth.js';

export const authRouter = Router();

// POST /api/auth/register - Register a new user account
authRouter.post('/register', (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'A valid email address is required.' });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const userName = (name && name.trim()) || email.split('@')[0];

    const existing = dbService.getUserByEmail(email);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists. Please log in.' });
    }

    const passwordHash = hashPassword(password);
    const user = dbService.createUser(email, passwordHash, userName);
    const { token } = dbService.createSession(user.id);

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      token,
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    res.status(500).json({ error: err.message || 'Registration failed' });
  }
});

// POST /api/auth/login - Log into existing account
authRouter.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = dbService.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isValid = verifyPassword(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const { token } = dbService.createSession(user.id);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      token,
    });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ error: err.message || 'Login failed' });
  }
});

// GET /api/auth/me - Retrieve current authenticated user profile
authRouter.get('/me', authenticateUser, (req, res) => {
  res.json({
    user: req.user,
  });
});

// POST /api/auth/logout - End current session
authRouter.post('/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    dbService.deleteSession(token);
  }
  res.json({ success: true });
});
