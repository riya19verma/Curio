import express from 'express';
//import {router} from "./routes/user.route.js"; 
import cors from 'cors';
import cookieParser from 'cookie-parser';
import {startNewsCron} from "./services/cron.services.js";
import recommend from "./routes/recommendation.route.js";
import analyze_url from "./routes/analyze_url.route.js";
import user from "./routes/user.route.js";
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const app = express();

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}));

app.use(express.json({ limit: '16kb'}));
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

app.use(cookieParser());

app.use("/api/user", user);
//https://localhost:3000/api/user/embedding/new

app.use("/api/recommendation", recommend);
//https://localhost:3000/api/recommendation

app.use("/api/analyze-url", analyze_url);
//https://localhost:3000/api/analyze-url

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT} at http://localhost:${PORT}`);
});

startNewsCron();