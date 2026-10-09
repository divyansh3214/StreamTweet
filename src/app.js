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
app.use(cookieParser());

app.get("/", (req, res) => {
  const frontendUrl = process.env.FRONTEND_URL || process.env.API_TARGET || "http://127.0.0.1:5173";
  res.json({
    name: "StreamTweet API",
    message: "This server provides the StreamTweet API. Open the Next.js frontend at the configured frontend URL to use the new UI.",
    frontendUrl,
    apiBase: "/api/v1"
  });
});

import userRoutes from "./routes/user.routs.js";
import videoRoutes from "./routes/video.routes.js";
import tweetRoutes from "./routes/tweets.routes.js";
import commentRoutes from "./routes/comments.routes.js";
import likeRoutes from "./routes/likes.routes.js";
import playlistRoutes from "./routes/playlists.routes.js";
import replyRoutes from "./routes/reply.routes.js";
app.use("/api/v1/playlists",playlistRoutes);
app.use("/api/v1/comments",commentRoutes);
app.use("/api/v1/replies",replyRoutes);
app.use("/api/v1/tweets",tweetRoutes);
app.use("/api/v1/videos",videoRoutes);
app.use("/api/v1/users",userRoutes);
app.use("/api/v1/likes",likeRoutes);

export default app;
