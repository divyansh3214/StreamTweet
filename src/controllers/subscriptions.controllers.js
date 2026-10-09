import mongoose from "mongoose";
import { subscription } from "../models/subscriptions.models.js";
import user from "../models/user.model.js";
import { asyncHandler } from "../utils/async_handler.js";
import Api_response from "../utils/Api_response.js";
import ApiiError from "../utils/Api_error.js";

const subscribeToChannel = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  const subscriberId = req.loggedoutuser?._id;

  if (!mongoose.isValidObjectId(channelId)) {
    throw new ApiiError(400, "A valid channel ID is required");
  }
  if (String(subscriberId) === String(channelId)) {
    throw new ApiiError(400, "You cannot subscribe to your own channel");
  }

  const channelExists = await user.exists({ _id: channelId });
  if (!channelExists) {
    throw new ApiiError(404, "Channel not found");
  }

  const channelSubscription = await subscription.findOneAndUpdate(
    { subscriber: subscriberId, channels: channelId },
    { $setOnInsert: { subscriber: subscriberId, channels: channelId } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );

  return res
    .status(200)
    .json(new Api_response(200, channelSubscription, "Subscribed to channel successfully"));
});

const unsubscribeFromChannel = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  const subscriberId = req.loggedoutuser?._id;

  if (!mongoose.isValidObjectId(channelId)) {
    throw new ApiiError(400, "A valid channel ID is required");
  }
  if (!(await user.exists({ _id: channelId }))) {
    throw new ApiiError(404, "Channel not found");
  }

  await subscription.deleteMany({ subscriber: subscriberId, channels: channelId });

  return res
    .status(200)
    .json(new Api_response(200, {}, "Unsubscribed from channel successfully"));
});

const getSubscribedChannels = asyncHandler(async (req, res) => {
  const channels = await subscription
    .find({ subscriber: req.loggedoutuser?._id })
    .sort({ createdAt: -1 })
    .populate("channels", "username fullname avatar coverImage")
    .lean();

  return res.status(200).json(new Api_response(
    200,
    channels.map((entry) => entry.channels).filter(Boolean),
    "Subscribed channels fetched successfully",
  ));
});

export { subscribeToChannel, unsubscribeFromChannel, getSubscribedChannels };
