import express from "express";
import cors from"cors";
import cookieParser from "cookie-parser";
const app=express();
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}));
app.use(express.json({limit:"1mb"}));
app.use(express.urlencoded({extended:true,limit:"1mb"}));
app.use(express.static("public"));
app.use(cookieParser());

import userRoutes from "./routes/user.routs.js";
import videoRoutes from "./routes/video.routes.js";
import tweetRoutes from "./routes/tweets.routes.js";
import commentRoutes from "./routes/comments.routes.js";
import likeRoutes from "./routes/likes.routes.js";
app.use("/api/v1/comments",commentRoutes);
app.use("/api/v1/tweets",tweetRoutes);
app.use("/api/v1/videos",videoRoutes);
app.use("/api/v1/users",userRoutes);
app.use("/api/v1/likes",likeRoutes);

export default app;
