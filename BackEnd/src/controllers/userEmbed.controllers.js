/**
 * BackEnd/src/controllers/userEmbed.controllers.js
 */

import pool from '../db/db.js';
import { ApiError }    from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { meanEmbedding, normalize } from '../utils/helperFunc.utils.js';

const parseEmbed = (e) => {
  if (!e) return null;
  try {
    const parsed = typeof e === 'string' ? JSON.parse(e) : e;
    if (!Array.isArray(parsed) || parsed.some(v => isNaN(v))) return null;
    return parsed;
  } catch { return null; }
};

const formatEmbed = (arr) => `[${arr.join(',')}]`;

// ─────────────────────────────────────────────────────────────────────────────
// newUserEmbedding  —  POST /api/user/embedding/new
// Body: { categories: string[] }
// ─────────────────────────────────────────────────────────────────────────────
const newUserEmbedding = asyncHandler(async (req, res) => {
  const userID     = req.user?.uid ?? req.body.uid;
  const categories = req.body.categories;

  if (!userID) throw new ApiError(400, 'uid is required');
  if (!Array.isArray(categories) || categories.length === 0)
    throw new ApiError(400, 'At least one category is required');

  let client;
  try {
    client = await pool.connect();

    // Build parameterised IN clause — categories passed once for each alias col
    const ph = categories.map((_, i) => `$${i + 1}`).join(', ');
    const result = await client.query(
      `SELECT embeddings FROM categories
        WHERE category_name IN (${ph}) OR cat_name IN (${ph})`,
      [...categories, ...categories]
    );

    if (result.rows.length === 0)
      throw new ApiError(404, 'No embeddings found — run news ingestion first');

    const embeds = result.rows.map(r => parseEmbed(r.embeddings)).filter(Boolean);
    if (embeds.length === 0)
      throw new ApiError(500, 'Category embeddings not yet computed');

    const normalized = normalize(meanEmbedding(embeds));

    await client.query(
      `INSERT INTO user_embeddings (uid, embed)
       VALUES ($1, $2)
       ON CONFLICT (uid) DO UPDATE SET embed = EXCLUDED.embed`,
      [userID, formatEmbed(normalized)]
    );

    return res.status(200).json(
      new ApiResponse(200, null, 'User embedding created successfully')
    );
  } catch (err) {
    console.error('newUserEmbedding error:', err);
    throw new ApiError(500, err.message || 'Error creating user embedding');
  } finally {
    if (client) client.release();
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// updateUserEmbedding  —  POST /api/user/embedding/update
// Body: { uid, news: [{ nid }, ...] }
// ─────────────────────────────────────────────────────────────────────────────
const updateUserEmbedding = asyncHandler(async (req, res) => {
  const userID = req.body.uid ?? req.user?.uid;
  const news   = req.body.news;

  if (!userID) throw new ApiError(400, 'uid is required');
  if (!Array.isArray(news) || news.length === 0)
    throw new ApiError(400, 'news click array is required');

  let client;
  try {
    client = await pool.connect();

    const userRow = await client.query(
      `SELECT embed FROM user_embeddings WHERE uid = $1`, [userID]
    );
    if (userRow.rows.length === 0)
      throw new ApiError(404, 'User embedding not found — complete onboarding first');

    let userEmbed = parseEmbed(userRow.rows[0].embed);
    if (!userEmbed) throw new ApiError(500, 'Stored user embedding is malformed');

    const alpha = 0.2;

    for (const item of news) {
      const newsRow = await client.query(
        `SELECT embed FROM news_embeddings WHERE nid = $1`, [item.nid]
      );
      if (newsRow.rows.length === 0) { console.warn(`No embed for NID ${item.nid}`); continue; }
      const newsEmbed = parseEmbed(newsRow.rows[0].embed);
      if (!newsEmbed) continue;
      // accumulate outside the inner scope (this was the original scoping bug)
      userEmbed = normalize(
        userEmbed.map((v, i) => (1 - alpha) * v + alpha * newsEmbed[i])
      );
    }

    await client.query(
      `UPDATE user_embeddings SET embed = $1 WHERE uid = $2`,
      [formatEmbed(userEmbed), userID]
    );

    return res.status(200).json(
      new ApiResponse(200, null, `Embedding updated from ${news.length} click(s)`)
    );
  } catch (err) {
    console.error('updateUserEmbedding error:', err);
    throw new ApiError(500, err.message || 'Error updating user embedding');
  } finally {
    if (client) client.release();
  }
});

export { newUserEmbedding, updateUserEmbedding };