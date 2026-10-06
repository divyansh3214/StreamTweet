//export { togglevideolike, toggleCommentlike , toggleTweetlike, getalllikedvideobyuser};
import express from "express";
import { togglevideolike, toggleCommentlike , toggleTweetlike, getalllikedvideobyuser} from "../controllers/likes.controllers.js";
import { varifyJWT } from "../middlewares/auth.middleware.js";

const router=express.Router();

router.route("/toggle-video-like/:videoid").post(varifyJWT,togglevideolike);
router.route("/toggle-comment-like/:commentid").post(varifyJWT,toggleCommentlike);
router.route("/toggle-tweet-like/:tweetid").post(varifyJWT,toggleTweetlike);
router.route("/get-all-liked-videos").get(varifyJWT,getalllikedvideobyuser);

export default router;