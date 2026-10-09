import { Router } from "express";
import {
  create_reply,
  delete_reply,
  like_reply,
  noof_likes,
  update_reply,
} from "../controllers/reply.controllers.js";
import { varifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/create-reply/:comment_id").post(varifyJWT, create_reply);
router.route("/delete-reply/:reply_id").delete(varifyJWT, delete_reply);
router.route("/update-reply/:reply_id").put(varifyJWT, update_reply);
router.route("/like-reply/:reply_id").post(varifyJWT, like_reply);
router.route("/noof-likes/:reply_id").get(noof_likes);

export default router;
