import express from "express";
import {registerUser, loginUser, logoutUser, refreshAcesssToken} from "../controllers/login.controllers.js";
import {verifyToken} from "../middlewares/auth.middlewares.js";
const router = express.Router();

router.route("/signup").post(registerUser); 
router.route("/login").post(loginUser);
router.route("/logout").post(
    verifyToken,
    logoutUser
);
router.route("/refreshToken").post(refreshAcesssToken)
export {router};