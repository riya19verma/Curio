import pool from "../db/db.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { meanEmbedding, normalize } from "../utils/helperFunc.utils.js";

// ── Helper: parse pgvector string "[0.1,0.2,...]" → JS array ─────────────────
const parseEmbed = (e) => {
    if (!e) return null;
    try {
        const parsed = typeof e === 'string' ? JSON.parse(e) : e;
        if (!Array.isArray(parsed)) return null;
        if (parsed.some(v => isNaN(v))) return null;
        return parsed;
    } catch {
        return null;
    }
};

// ── Helper: format JS array → pgvector string ─────────────────────────────────
const formatEmbed = (arr) => `[${arr.join(',')}]`;

// ─────────────────────────────────────────────────────────────────────────────
// newUserEmbedding
// POST /api/user/embedding/new
// Creates (or replaces) a user embedding seeded from their chosen categories.
// ─────────────────────────────────────────────────────────────────────────────
const newUserEmbedding = asyncHandler(async (req, res) => {
    const userID = req.user.uid;
    const categories = req.body.categories;

    if (!categories || categories.length === 0) {
        throw new ApiError(400, "At least one category is required for embedding calculation");
    }

    let client;
    try {
        client = await pool.connect();

        // Support both an array of names and a single comma-separated string
        const categoryList = Array.isArray(categories) ? categories : [categories];

        const placeholders = categoryList.map((_, i) => `$${i + 1}`).join(', ');
        const categoryResult = await client.query(
            `SELECT embeddings FROM categories WHERE category_name IN (${placeholders})`,
            categoryList
        );

        if (categoryResult.rows.length === 0) {
            throw new ApiError(404, "No embeddings found for the provided categories");
        }

        const categoryEmbeddings = categoryResult.rows
            .map(row => parseEmbed(row.embeddings))
            .filter(e => e !== null);

        if (categoryEmbeddings.length === 0) {
            throw new ApiError(500, "Category embeddings are not yet computed");
        }

        const normalizedEmbedding = normalize(meanEmbedding(categoryEmbeddings));

        await client.query(
            `INSERT INTO user_embeddings (uid, embed)
             VALUES ($1, $2)
             ON CONFLICT (uid) DO UPDATE SET embed = EXCLUDED.embed`,
            [userID, formatEmbed(normalizedEmbedding)]
        );

        return res.status(200).json(
            new ApiResponse(200, null, "User embedding created successfully")
        );

    } catch (err) {
        console.error("Database error:", err);
        throw new ApiError(500, err.message || "An error occurred while saving user embedding");
    } finally {
        if (client) client.release();
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// updateUserEmbedding
// POST /api/user/embedding/update
// Called by the port-5000 server on page load with the user's recent clicks.
// Body: { uid, news: [{ nid }, ...] }
// For each clicked article's embedding, blends it into the user embedding
// using an exponential moving average (alpha = 0.2).
// ─────────────────────────────────────────────────────────────────────────────
const updateUserEmbedding = asyncHandler(async (req, res) => {
    // uid can come from the JWT (req.user.uid) or from the body (sent by port 5000 proxy)
    const userID = req.body.uid || req.user?.uid;
    const news = req.body.news;

    if (!userID) {
        throw new ApiError(400, "uid is required");
    }
    if (!news || news.length === 0) {
        throw new ApiError(400, "News click data is required for embedding update");
    }

    let client;
    try {
        client = await pool.connect();

        // Fetch current user embedding
        const userEmbeddingResult = await client.query(
            `SELECT embed FROM user_embeddings WHERE uid = $1`,
            [userID]
        );

        if (userEmbeddingResult.rows.length === 0) {
            throw new ApiError(404, "User embedding not found — run /embedding/new first");
        }

        let userEmbedding = parseEmbed(userEmbeddingResult.rows[0].embed);
        if (!userEmbedding) {
            throw new ApiError(500, "Stored user embedding is malformed");
        }

        const alpha = 0.2; // weight of each new click on the running average

        // Process each clicked article in order (oldest first, as sent by flush-clicks)
        for (const item of news) {
            const nid = item.nid;

            const newsResult = await client.query(
                `SELECT embed FROM news_embeddings WHERE nid = $1`,
                [nid]
            );

            if (newsResult.rows.length === 0) {
                // Embedding not yet computed for this article — skip gracefully
                console.warn(`No embedding found for NID ${nid}, skipping`);
                continue;
            }

            const newsEmbedding = parseEmbed(newsResult.rows[0].embed);
            if (!newsEmbedding) {
                console.warn(`Malformed embedding for NID ${nid}, skipping`);
                continue;
            }

            // Blend: new = normalize( (1-α)*user + α*article )
            userEmbedding = normalize(
                userEmbedding.map((val, idx) =>
                    (1 - alpha) * val + alpha * newsEmbedding[idx]
                )
            );
        }

        // Persist the final blended embedding
        await client.query(
            `UPDATE user_embeddings SET embed = $1 WHERE uid = $2`,
            [formatEmbed(userEmbedding), userID]
        );

        return res.status(200).json(
            new ApiResponse(200, null, `User embedding updated from ${news.length} click(s)`)
        );

    } catch (err) {
        console.error("Database error:", err);
        throw new ApiError(500, err.message || "An error occurred while updating user embedding");
    } finally {
        if (client) client.release();
    }
});

export {
    newUserEmbedding,
    updateUserEmbedding
};