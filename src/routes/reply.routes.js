import { Router } from "express";
import {
  create_reply,
  create_tweet_reply,
  create_reply_to_reply,
  delete_reply,
  get_comment_replies,
  get_reply_replies,
  get_tweet_replies,
  like_reply,
  noof_likes,
  update_reply,
} from "../controllers/reply.controllers.js";
import { varifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/create-reply/:comment_id").post(varifyJWT, create_reply);
router.route("/get-comment-replies/:comment_id").get(varifyJWT, get_comment_replies);
router.route("/create-tweet-reply/:tweet_id").post(varifyJWT, create_tweet_reply);
router.route("/get-tweet-replies/:tweet_id").get(varifyJWT, get_tweet_replies);
router.route("/create-reply-to-reply/:reply_id").post(varifyJWT, create_reply_to_reply);
router.route("/get-reply-replies/:reply_id").get(varifyJWT, get_reply_replies);
router.route("/delete-reply/:reply_id").delete(varifyJWT, delete_reply);
router.route("/update-reply/:reply_id").put(varifyJWT, update_reply);
router.route("/like-reply/:reply_id").post(varifyJWT, like_reply);
router.route("/noof-likes/:reply_id").get(noof_likes);

export default router;
