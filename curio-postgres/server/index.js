import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import session from 'express-session';
import passport, {googleConfigured} from './config/passport.config.js';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './models/db.models.js';
import headlines from './routes/news.routes.js';
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── ENV VALIDATION ─────────────────────────
const required = ['DATABASE_URL', 'JWT_SECRET', 'SESSION_SECRET'];
const missing = required.filter(
  k => !process.env[k] || process.env[k].startsWith('your_')
);

if (missing.length) {
  console.error('❌ Missing env vars:', missing.join(', '));
  process.exit(1);
}

const CLIENT_URL =
  process.env.CLIENT_URL || `http://localhost:${process.env.PORT || 5000}`;

const app = express();

// ── MIDDLEWARE ─────────────────────────────
app.use(cors({
  origin: CLIENT_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,  // ✅ Set to false for localhost (no HTTPS)
    httpOnly: true,
    sameSite: 'lax',  // ✅ Add this for better compatibility
    maxAge: 7 * 24 * 60 * 60 * 1000
  }
}));

app.use(passport.initialize());
app.use(passport.session());
app.use("/api/news",headlines);
// ── STATIC FILES ───────────────────────────
app.use(express.static(path.join(__dirname, '../public')));

// ── ROUTES ────────────────────────────────
import authRoutes from './routes/auth.routes.js';
import newsRoutes from './routes/news.routes.js';
import chatRoutes from './routes/chat.routes.js';
import userRoutes from './routes/user.routes.js';   // ← NEW


app.use('/api/auth', authRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/user', userRoutes);                   // ← NEW  e.g. POST /api/user/preferences


app.get('/api/health', (_, res) => {
  res.json({
    status: 'ok',
    googleOAuth: !!googleConfigured
  });
});

// ── SPA FALLBACK ──────────────────────────
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '../public/index.html'));
  }
});

// ── START SERVER ──────────────────────────
const startServer = async () => {
  try {
    // ✅ Test PostgreSQL connection
    await pool.query('SELECT 1');

    console.log('✅ PostgreSQL connected');

    app.listen(process.env.PORT || 5000, () => {
      console.log(`🚀 Server running on http://localhost:${process.env.PORT || 5000}`);

      if (!googleConfigured) {
        console.warn('⚠️ Google OAuth disabled');
      }
    });

  } catch (err) {
    console.error('❌ PostgreSQL connection error:', err);
    process.exit(1);
  }
};

startServer();