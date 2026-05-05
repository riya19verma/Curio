import express from 'express';
import authMiddleware from '../middleware/auth.middleware.js';
import pool from '../models/db.models.js';
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

// ─────────────────────────────────────────────
// Dummy News
// ─────────────────────────────────────────────
const DUMMY_NEWS = [
  { id:'1', title:'Scientists Discover Water on Mars', category:'Science', image:'https://picsum.photos/seed/mars/400/240', summary:'NASA researchers confirm subsurface water lake beneath Martian south pole.', validity: 94, date:'2025-05-01', source:'NASA' },
  { id:'2', title:'Global EV Sales Hit Record High in Q1 2025', category:'Technology', image:'https://picsum.photos/seed/ev/400/240', summary:'Electric vehicle sales surpassed 4 million units globally in first quarter.', validity: 88, date:'2025-04-30', source:'Reuters' },
  { id:'3', title:'Viral Claim: Drinking Hot Water Cures Diabetes', category:'Health', image:'https://picsum.photos/seed/health1/400/240', summary:'Doctors debunk social media claim spreading across WhatsApp groups.', validity: 12, date:'2025-04-29', source:'WebMD' },
  { id:'4', title:'India GDP Growth Hits 7.8% in FY25', category:'Business', image:'https://picsum.photos/seed/india/400/240', summary:'Finance Ministry reports robust growth driven by manufacturing and services.', validity: 91, date:'2025-04-28', source:'Bloomberg' },
  { id:'5', title:'New AI Model Beats Human Chess Grandmasters', category:'Technology', image:'https://picsum.photos/seed/chess/400/240', summary:'DeepMind\'s latest model achieves 3200 ELO rating in blitz chess.', validity: 76, date:'2025-04-27', source:'The Verge' },
  { id:'6', title:'False: Microchips Found in COVID Vaccines', category:'Health', image:'https://picsum.photos/seed/vax/400/240', summary:'Independent labs confirm no microchips or tracking devices in vaccines.', validity: 3, date:'2025-04-26', source:'WHO' },
  { id:'7', title:'Amazon Rainforest Shows Signs of Recovery', category:'Environment', image:'https://picsum.photos/seed/amazon/400/240', summary:'Satellite data shows 12% increase in vegetation density over five years.', validity: 82, date:'2025-04-25', source:'Nature' },
  { id:'8', title:'India Wins T20 World Cup 2025', category:'Sports', image:'https://picsum.photos/seed/cricket/400/240', summary:'India defeated Australia by 6 wickets in a thrilling final at Melbourne.', validity: 97, date:'2025-04-24', source:'ESPNcricinfo' },
  { id:'9', title:'Tech Layoffs: 50,000 Jobs Cut This Quarter', category:'Business', image:'https://picsum.photos/seed/layoff/400/240', summary:'Major tech firms continue restructuring amid AI automation adoption.', validity: 79, date:'2025-04-23', source:'TechCrunch' },
  { id:'10', title:'Claim: 5G Towers Cause Brain Tumors', category:'Health', image:'https://picsum.photos/seed/5g/400/240', summary:'Multiple peer-reviewed studies find no link between 5G exposure and cancer.', validity: 5, date:'2025-04-22', source:'WHO' },
  { id:'11', title:'James Webb Telescope Captures Oldest Galaxy', category:'Science', image:'https://picsum.photos/seed/jwst/400/240', summary:'New images reveal galaxy formed just 300 million years after Big Bang.', validity: 96, date:'2025-04-21', source:'NASA' },
  { id:'12', title:'India Bans Single-Use Plastics Nationwide', category:'Environment', image:'https://picsum.photos/seed/plastic/400/240', summary:'Government enforces strict new rules on packaging and disposable items.', validity: 88, date:'2025-04-20', source:'The Hindu' },
];

// GET /api/news
router.get('/', (req, res) => {
  const { category, page = 1, limit = 6 } = req.query;

  let news = DUMMY_NEWS;
  if (category && category !== 'All') {
    news = news.filter(n => n.category === category);
  }

  const start = (page - 1) * limit;

  res.json({
    news: news.slice(start, start + Number(limit)),
    total: news.length
  });
});

// GET /api/news/top10
router.get('/top10', (req, res) => {
  res.json(DUMMY_NEWS.slice(0, 10));
});

// GET /api/news/categories
router.get('/categories', (req, res) => {
  const cats = ['All', ...new Set(DUMMY_NEWS.map(n => n.category))];
  res.json(cats);
});

// POST /api/news/bookmark/:id
router.post('/bookmark/:id', authMiddleware, async (req, res) => {
  const UID = req.user.id;
  const NID = req.params.id;

  let client;

  try {
    client = await pool.connect();

    const check = await client.query(
      `SELECT * FROM bookmarks WHERE UID = $1 AND NID = $2`,
      [UID, NID]
    );

    if (check.rows.length > 0) {
      await client.query(
        `DELETE FROM bookmarks WHERE UID = $1 AND NID = $2`,
        [UID, NID]
      );

      return res.json({ message: "Bookmark removed", bookmarked: false });
    } else {
      await client.query(
        `INSERT INTO bookmarks (UID, NID) VALUES ($1, $2)`,
        [UID, NID]
      );

      return res.json({ message: "Bookmark added", bookmarked: true });
    }

  } catch (err) {
    console.error("Bookmark error:", err);
    res.status(500).json({ message: "Server error" });
  } finally {
    if (client) client.release();
  }
});


// ─────────────────────────────────────────────
// POST /api/news/click
// Log a news article click for the logged-in user.
// Body: { nid }  — the UUID of the news article in the `news` table.
// ─────────────────────────────────────────────
router.post('/click', authMiddleware, async (req, res) => {
  const uid = req.user.id;
  const { nid } = req.body;
 
  if (!nid) return res.status(400).json({ message: 'nid is required' });
 
  let client;
  try {
    client = await pool.connect();
 
    // Verify the article exists before inserting (avoids FK violation)
    const exists = await client.query(
      `SELECT 1 FROM news WHERE nid = $1`,
      [nid]
    );
    if (exists.rows.length === 0) {
      return res.status(404).json({ message: 'Article not found' });
    }
 
    await client.query(
      `INSERT INTO user_clicks (uid, nid) VALUES ($1, $2)`,
      [uid, nid]
    );
 
    return res.json({ message: 'Click logged' });
 
  } catch (err) {
    console.error('Click log error:', err);
    res.status(500).json({ message: 'Server error' });
  } finally {
    if (client) client.release();
  }
});
 
// ─────────────────────────────────────────────
// POST /api/news/flush-clicks
// Called on page load for logged-in users.
// Reads all unprocessed clicks from the last session, forwards
// them to the BackEnd (port 3000) to update the user embedding,
// then clears those click records.
// ─────────────────────────────────────────────
router.post('/flush-clicks', authMiddleware, async (req, res) => {
  const uid = req.user.id;
 
  // Nothing to do if BackEnd secret is not configured
  const backendSecret = process.env.BACKEND_JWT_SECRET;
  if (!backendSecret) {
    return res.status(503).json({ message: 'BACKEND_JWT_SECRET not set' });
  }
 
  let client;
  try {
    client = await pool.connect();
 
    // Fetch all recorded clicks for this user
    const clickResult = await client.query(
      `SELECT nid FROM user_clicks WHERE uid = $1 ORDER BY clicked_at ASC`,
      [uid]
    );
 
    const clicks = clickResult.rows; // [{ nid }, ...]
 
    if (clicks.length === 0) {
      return res.json({ message: 'No clicks to flush', flushed: 0 });
    }
 
    // Build a short-lived token that the BackEnd can verify
    const backendToken = jwt.sign(
      { uid },
      backendSecret,
      { expiresIn: '1m' }
    );
 
    // Call BackEnd /api/user/embedding/update
    const response = await fetch('http://localhost:3000/api/user/embedding/update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${backendToken}`
      },
      body: JSON.stringify({ uid, news: clicks }) // clicks = [{ nid }, ...]
    });
 
    // Even if the embedding update fails we still clear clicks to avoid
    // sending the same clicks again on the next reload.
    await client.query(
      `DELETE FROM user_clicks WHERE uid = $1`,
      [uid]
    );
 
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      console.warn('Embedding update failed:', errData.message);
      // Return partial success — clicks are cleared but embedding may be stale
      return res.status(207).json({
        message: 'Clicks cleared but embedding update failed',
        flushed: clicks.length,
        embeddingError: errData.message
      });
    }
 
    return res.json({ message: 'Clicks flushed and embedding updated', flushed: clicks.length });
 
  } catch (err) {
    console.error('Flush-clicks error:', err);
    res.status(500).json({ message: 'Server error' });
  } finally {
    if (client) client.release();
  }
});

// GET /api/news/headlines
router.get('/headlines', async (req, res) => {
  console.log("Fetching headlines...");
  const apiKey = process.env.NEWS_API_KEY;
  console.log("Using NEWS_API_KEY:", apiKey);
  if (!apiKey) return res.status(503).json({ message: 'NEWS_API_KEY not set' });

  try {
    console.log("Sending request to NewsAPI...");
    const response = await fetch(
      `https://newsapi.org/v2/top-headlines?language=en&pageSize=10&apiKey=${apiKey}`
    );
    const data = await response.json();
    console.log("Received response from NewsAPI:", data);
    if (data.status !== 'ok') {
      return res.status(500).json({ message: data.message || 'NewsAPI error' });
    }

    const headlines = data.articles.map((a, i) => ({
      rank:        i + 1,
      title:       a.title || 'Untitled',
      source:      a.source?.name || 'Unknown',
      url:         a.url,
      image:       a.urlToImage || null,
      publishedAt: a.publishedAt,
    }));

    res.json({ headlines });
  } catch (err) {
    console.error('Headlines fetch error:', err);
    res.status(500).json({ message: 'Failed to fetch headlines' });
  }
});

// POST /api/news/recommendations  — proxies to BackEnd on port 3000
router.post('/recommendations', authMiddleware, async (req, res) => {
  try {
    // Generate a port 3000 compatible token using its secret
    const backendToken = jwt.sign(
      { uid: req.user.id },
      process.env.BACKEND_JWT_SECRET,
      { expiresIn: '1h' }
    );

    const response = await fetch('http://localhost:3000/api/recommendation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${backendToken}`
      },
      body: JSON.stringify({ uid: req.user.id }) 
    });

    const data = await response.json();
    res.status(response.status).json(data);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
export { DUMMY_NEWS };