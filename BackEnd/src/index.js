import express from 'express';
//import {router} from "./routes/user.route.js"; 
import cors from 'cors';
import cookieParser from 'cookie-parser';
import {startNewsCron} from "./services/cron.services.js";

const app = express();

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}));

app.use(express.json({ limit: '16kb'}));
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

app.use(cookieParser());


//app.use("/api/User", router);
//https://localhost:3000/api/User/login

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT} at http://localhost:${PORT}`);
});

startNewsCron();