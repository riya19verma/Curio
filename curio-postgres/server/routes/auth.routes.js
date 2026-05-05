import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import passport from '../config/passport.config.js';
import pool from '../models/db.models.js';
import { googleConfigured } from '../config/passport.config.js';

const router = express.Router();

// Postgres uses user.id (UUID), not user._id
const sign = (user) => jwt.sign(
  { id: user.uid, name: user.uname, email: user.email },
  process.env.JWT_SECRET,
  { expiresIn: '7d' }
);

// POST /api/auth/register
router.post('/register', async (req, res) => {
    const { name, phone, email, password, category, country } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ message: 'Name, email and password are required' });

    if(password.length < 8) {
        throw new ApiError(400, "Password must be at least 8 characters long");
    }
    if(
        password.search(/[A-Z]/) < 0 || 
        password.search(/[a-z]/) < 0 ||
        password.search(/[0-9]/) < 0 ||
        password.search(/[@$!%*?&=_-]/) < 0
    ) {
        throw new ApiError(400, "Password must contain at least one uppercase letter, one lowercase letter, one number and one special character");
    }

    if(!email.match(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)) {
        throw new ApiError(400, "Invalid email format");
    }

    let client;
    try{
      client = await pool.connect();
      await client.query('BEGIN');

      //check for exiting user with same email
      const result = await client.query(
        'SELECT * FROM users WHERE email = $1', 
        [email]
      );
      if(result.rows.length > 0){
        return res
        .status(409)
        .json(
          { message: 'Email already registered' }
        );
      }
      const hashedPassword = await bcrypt.hash(password, 10);

      const query = `
        INSERT INTO users (uname, ph_no, email, pass_hashed, country)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING uid, uname, email
      `
      const userResult  = await client.query(query, [name, phone, email, hashedPassword, country]);
      const user = userResult.rows[0];
      const userId = user.uid;
      if(category){
        const categoryQuery = `
        INSERT INTO user_preferences (UID, n_category)
        VALUES ($1, $2)
        `
        await client.query(categoryQuery, [userId, category]);
      }
     await client.query('COMMIT');

    return res.status(201).json({
      token: sign(user),
      user
    });

    } catch (err) {
      if (client) await client.query('ROLLBACK');
      console.error("REGISTER ERROR:", err);
      return res.status(500).json({ message: err.message });

    } finally {
      if (client) client.release();
    }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  let client;

  try {
    client = await pool.connect();

    const result = await client.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    const user = result.rows[0];

    if (!user || !user.pass_hashed) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.pass_hashed);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    return res.json({
      token: sign(user),
      user: {
        id: user.uid,
        name: user.uname,
        email: user.email
      }
    });

  } catch (err) {
    console.error("LOGIN ERROR:", err);
    return res.status(500).json({ message: err.message });

  } finally {
    if (client) client.release();
  }
});

// GET /api/auth/google
router.get('/google', (req, res, next) => {
  console.log('Google auth endpoint hit');
  if (!googleConfigured) {
    return res.status(503).json({
      message: 'Google OAuth not configured'
    });
  }

  passport.authenticate('google', {
    scope: ['profile', 'email']
  })(req, res, next);
});

// GET /api/auth/google/callback
router.get('/google/callback', (req, res, next) => {
  if (!googleConfigured) {
    return res.redirect('/?error=oauth_not_configured');
  }

  passport.authenticate('google', {
    failureRedirect: '/?error=oauth_failed'
  })(req, res, (err) => {
    if (err) return next(err);

    const token = sign(req.user);

    res.redirect(`/?token=${token}`);
  });
});

// GET /api/auth/status
router.get('/status', (req, res) => {
  res.json({ googleOAuth: !!googleConfigured });
});

export default router;