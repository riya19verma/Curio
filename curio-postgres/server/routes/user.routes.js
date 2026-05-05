/**
 * curio-postgres/server/routes/user.routes.js
 *
 * Handles everything user-profile related that lives on the port-5000 server:
 *   POST /api/user/preferences  — save selected categories after onboarding
 *   GET  /api/user/preferences  — return saved categories for the current user
 *   GET  /api/user/onboarding   — check whether onboarding is still pending
 */

import express from 'express';
import jwt from 'jsonwebtoken';
import authMiddleware from '../middleware/auth.middleware.js';
import pool from '../models/db.models.js';

const router = express.Router();

// ── All eight categories the app supports ────────────────────────────────────
const VALID_CATEGORIES = [
  'World', 'Technology', 'Sports', 'Business',
  'Science', 'Entertainment', 'Politics', 'Environment',
];

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/user/onboarding
// Returns { done: boolean } so the frontend knows whether to show the picker.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/onboarding', authMiddleware, async (req, res) => {
  let client;
  try {
    client = await pool.connect();
    const result = await client.query(
      `SELECT onboarding_done FROM users WHERE uid = $1`,
      [req.user.id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ message: 'User not found' });

    return res.json({ done: result.rows[0].onboarding_done ?? false });
  } catch (err) {
    console.error('Onboarding check error:', err);
    return res.status(500).json({ message: 'Server error' });
  } finally {
    if (client) client.release();
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/user/preferences
// Returns the list of categories the user has previously selected.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/preferences', authMiddleware, async (req, res) => {
  let client;
  try {
    client = await pool.connect();
    const result = await client.query(
      `SELECT n_category FROM user_preferences WHERE uid = $1 ORDER BY n_category`,
      [req.user.id]
    );
    return res.json({ categories: result.rows.map(r => r.n_category) });
  } catch (err) {
    console.error('Get preferences error:', err);
    return res.status(500).json({ message: 'Server error' });
  } finally {
    if (client) client.release();
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/user/preferences
// Body: { categories: string[] }  — e.g. ["Technology", "Sports"]
//
// 1. Validates each category name.
// 2. Upserts rows in user_preferences (replaces any previous selection).
// 3. Marks onboarding_done = true on the users row.
// 4. Forwards the category list to the BackEnd (port 3000) to seed the user's
//    interest embedding.  If the BackEnd is unavailable, we still return 200
//    so the user isn't blocked — embedding will be seeded on next login.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/preferences', authMiddleware, async (req, res) => {
  const uid = req.user.id;
  const { categories } = req.body;

  // ── Validation ─────────────────────────────────────────────────────────────
  if (!Array.isArray(categories) || categories.length === 0) {
    return res.status(400).json({ message: 'Select at least one category' });
  }
  if (categories.length > 8) {
    return res.status(400).json({ message: 'Cannot select more than 8 categories' });
  }
  const invalid = categories.filter(c => !VALID_CATEGORIES.includes(c));
  if (invalid.length > 0) {
    return res.status(400).json({ message: `Unknown categories: ${invalid.join(', ')}` });
  }

  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');

    // Replace the user's entire preference set atomically
    await client.query(
      `DELETE FROM user_preferences WHERE uid = $1`,
      [uid]
    );

    for (const cat of categories) {
      await client.query(
        `INSERT INTO user_preferences (uid, n_category, cat_score, updated_at)
         VALUES ($1, $2, 1.0, NOW())
         ON CONFLICT (uid, n_category) DO UPDATE
           SET cat_score  = 1.0,
               updated_at = NOW()`,
        [uid, cat]
      );
    }

    // Mark onboarding as complete
    await client.query(
      `UPDATE users SET onboarding_done = true WHERE uid = $1`,
      [uid]
    );

    await client.query('COMMIT');

    // ── Trigger embedding seed on BackEnd (port 3000) — best-effort ─────────
    const backendSecret = process.env.BACKEND_JWT_SECRET;
    if (backendSecret) {
      const backendToken = jwt.sign({ uid }, backendSecret, { expiresIn: '5m' });
      fetch('http://localhost:3000/api/user/embedding/new', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${backendToken}`,
        },
        body: JSON.stringify({ categories }),
      }).catch(err => {
        // Non-fatal: log and continue
        console.warn('[preferences] Embedding seed failed:', err.message);
      });
    } else {
      console.warn('[preferences] BACKEND_JWT_SECRET not set — embedding not seeded');
    }

    return res.json({ message: 'Preferences saved', categories });

  } catch (err) {
    if (client) await client.query('ROLLBACK');
    console.error('Save preferences error:', err);
    return res.status(500).json({ message: 'Server error' });
  } finally {
    if (client) client.release();
  }
});

export default router;