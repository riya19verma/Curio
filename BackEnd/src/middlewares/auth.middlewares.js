import jwt from "jsonwebtoken";
import {ApiError} from "../utils/ApiError.js";
import pool from "../db/db.js";
import dotenv from "dotenv";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
dotenv.config();
const verifyToken = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");
  if(!token) {
    throw ApiError(401, "Unauthorized Request");
  }
  let client;
  try {
    client = await pool.connect();
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const result = await client.query(
        "SELECT UID, username, email FROM users WHERE UID = $1",
        [decoded?.id]
    );
    if(!result || result.rows.length === 0) {
        throw new ApiError(401, "Unauthorized Request");
    }
    req.user = result.rows[0];
    next();
  } catch (err) {
    return res.status(401).json(new ApiResponse(401, null, "Invalid token"));
  }
  finally {
    if (client) {
      client.release();
    }
  }
});

export {verifyToken};