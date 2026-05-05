import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import pool from '../models/db.models.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
dotenv.config();

const {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_CALLBACK_URL
} = process.env;

const googleConfigured =
  GOOGLE_CLIENT_ID &&
  GOOGLE_CLIENT_SECRET &&
  GOOGLE_CLIENT_ID !== 'your_google_client_id' &&
  GOOGLE_CLIENT_SECRET !== 'your_google_client_secret';

console.log("CLIENT ID:", GOOGLE_CLIENT_ID);
console.log("CLIENT SECRET:", GOOGLE_CLIENT_SECRET);
console.log("GOOGLE_CONFIGURED:", googleConfigured);

if (googleConfigured) {
  passport.use(new GoogleStrategy({
    clientID: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    callbackURL: GOOGLE_CALLBACK_URL,
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails?.[0]?.value;
      const name = profile.displayName;
      const avatar = profile.photos?.[0]?.value;
      const googleId = profile.id;

      if (!email) {
        return done(new Error("No email from Google"), null);
      }

      // 🔍 1. Check by google_id
      let result = await pool.query(
        'SELECT * FROM users WHERE google_id = $1',
        [googleId]
      );

      let user = result.rows[0];

      // 🔍 2. If not found, check by email
      if (!user) {
        result = await pool.query(
          'SELECT * FROM users WHERE email = $1',
          [email]
        );

        user = result.rows[0];
        const password = "1234";
        const hashedPassword = await bcrypt.hash(password, 10);

        if (user) {
          // 🔄 update existing user with google_id
          await pool.query(
            `UPDATE users
             SET google_id = $1, avatar = $2
             WHERE uid = $3`,
            [googleId, avatar, user.uid]
          );
        } else {
          // 🆕 create new user
          const insert = await pool.query(
            `INSERT INTO users (uname, email, google_id, avatar, pass_hashed)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [name, email, googleId, avatar, hashedPassword]
          );

          user = insert.rows[0];
        }
      }

      return done(null, user);

    } catch (err) {
      console.error("GOOGLE AUTH ERROR:", err);
      return done(err, null);
    }
  }));

  console.log('✅ Google OAuth strategy registered');

} else {
  console.warn('⚠️ Google OAuth not configured');
  if(!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET){
    console.warn('Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET');
  }
  else if(GOOGLE_CLIENT_ID === 'your_google_client_id' || GOOGLE_CLIENT_SECRET === 'your_google_client_secret'){
    console.warn('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set to default placeholders');
  }

}

// session handling
passport.serializeUser((user, done) => {
  done(null, user.uid);
});

passport.deserializeUser(async (uid, done) => {
  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE uid = $1',
      [uid]
    );
    done(null, result.rows[0]);
  } catch (err) {
    done(err, null);
  }
});

export default passport;
export { googleConfigured };