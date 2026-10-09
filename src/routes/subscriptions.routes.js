import { Router } from "express";
import {
  getSubscribedChannels,
  subscribeToChannel,
  unsubscribeFromChannel,
} from "../controllers/subscriptions.controllers.js";
import { varifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/my-channels").get(varifyJWT, getSubscribedChannels);
router.route("/subscribe/:channelId").post(varifyJWT, subscribeToChannel);
router.route("/unsubscribe/:channelId").delete(varifyJWT, unsubscribeFromChannel);

export default router;
