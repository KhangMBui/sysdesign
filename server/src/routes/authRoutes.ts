import { Router } from 'express';
import { sql } from '../db.js';
import {
  newUserId,
  hashPassword,
  verifyPassword,
  signToken,
  COOKIE_OPTIONS,
} from '../auth.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { seedProblemsForUser } from '../seedProblems.js';

export const authRouter = Router();

// POST /api/auth/register
authRouter.post('/register', async (req, res, next) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };

    if (!email || !email.includes('@')) {
      res.status(400).json({ error: 'A valid email is required.' });
      return;
    }
    if (!password || password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters.' });
      return;
    }

    const now = Date.now();
    const id = newUserId();
    const passwordHash = await hashPassword(password);

    await sql`
      INSERT INTO users (id, email, password_hash, created_at, updated_at)
      VALUES (${id}, ${email.toLowerCase().trim()}, ${passwordHash}, ${now}, ${now})
    `;

    await seedProblemsForUser(id);

    const token = signToken(id);
    res.cookie('token', token, COOKIE_OPTIONS);
    res.status(201).json({ user: { id, email: email.toLowerCase().trim(), createdAt: now } });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
authRouter.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const [user] = await sql<{ id: string; email: string; passwordHash: string; createdAt: number }[]>`
      SELECT * FROM users WHERE email = ${email.toLowerCase().trim()}
    `;

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      res.status(401).json({ error: 'Incorrect email or password.' });
      return;
    }

    const token = signToken(user.id);
    res.cookie('token', token, COOKIE_OPTIONS);
    res.status(200).json({ user: { id: user.id, email: user.email, createdAt: user.createdAt } });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout
authRouter.post('/logout', (_req, res) => {
  res.clearCookie('token', { ...COOKIE_OPTIONS, maxAge: 0 });
  res.status(200).json({});
});

// GET /api/auth/me
authRouter.get('/me', requireAuth, async (req, res, next) => {
  try {
    const [user] = await sql<{ id: string; email: string; createdAt: number }[]>`
      SELECT id, email, created_at FROM users WHERE id = ${req.userId}
    `;
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    res.json({ user });
  } catch (err) {
    next(err);
  }
});
