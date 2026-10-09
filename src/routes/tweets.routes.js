//export { createTweet, getuserTweets, deleteTweet, updateTweet };
import {Router} from "express";
import { createTweet, getuserTweets, getGlobalFeed, deleteTweet, updateTweet } from "../controllers/tweets.controllers.js";
import { varifyJWT } from "../middlewares/auth.middleware.js";

const router=Router();

router.route("/create-tweet").post(varifyJWT,createTweet);
router.route("/get-user-tweets").get(varifyJWT,getuserTweets);
router.route("/global-feed").get(varifyJWT,getGlobalFeed);
router.route("/delete-tweet/:tweetid").delete(varifyJWT,deleteTweet);
router.route("/update-tweet/:tweetid").put(varifyJWT,updateTweet);

export default router;