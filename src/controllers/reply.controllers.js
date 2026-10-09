import mongoose from "mongoose";
import { reply } from "../models/reply.models.js";
import { comments } from "../models/comments.model.js";
import { asyncHandler } from "../utils/async_handler.js";
import Api_response from "../utils/Api_response.js";
import ApiiError from "../utils/Api_error.js";
const create_reply = asyncHandler(async (req, res) => {
  const { comment_id } = req.params;
  const { content } = req.body;

  if (!mongoose.isValidObjectId(comment_id)) {
    throw new ApiiError(400, "A valid comment ID is required");
  }
  if (!content) {
    throw new ApiiError(400, "Reply content is required");
  }

  const user_id = req.loggedout?._id;
  if (!user_id) {
    throw new ApiiError(401, "User ID required");
  }
  const existingComment = await comments.findById(comment_id);
  if (!existingComment) {
    throw new ApiiError(404, "Comment not found");
  }

  const REPLY = await reply.create({
    content,
    owner: user_id,
    comment: comment_id,
  });

  return res
    .status(201)
    .json(new Api_response(201, REPLY, "Reply added successfully"));
});

const noof_likes = asyncHandler(async (req, res) => {
  const { reply_id } = req.params;

  if (!mongoose.isValidObjectId(reply_id)) {
    throw new ApiiError(400, "A valid reply ID is required");
  }

  const targetReply = await reply.findById(reply_id);

  if (!targetReply) {
    throw new ApiiError(404, "Reply not found");
  }

  const totalLikes = targetReply.liked.length;

  return res
    .status(200)
    .json(new Api_response(200, { totalLikes }, "Total likes fetched successfully"));
});
const like_reply = asyncHandler(async (req, res) => {
  const { reply_id } = req.params;
  const user_id = req.loggedout?._id;

  if (!mongoose.isValidObjectId(reply_id)) {
    throw new ApiiError(400, "A valid reply ID is required");
  }
  if (!user_id) {
    throw new ApiiError(401, "User ID is required");
  }

  const targetReply = await reply.findById(reply_id);
  if (!targetReply) {
    throw new ApiiError(404, "Reply not found");
  }

  const alreadyLiked = targetReply.liked.some((likedUserId) => String(likedUserId) === String(user_id));

  if (alreadyLiked) {
    targetReply.liked.pull(user_id);
    await targetReply.save();
    return res.status(200).json(new Api_response(200, targetReply, "Reply unliked successfully"));
  } else {
    targetReply.liked.push(user_id);
    await targetReply.save();
    return res.status(200).json(new Api_response(200, targetReply, "Reply liked successfully"));
  }
});
const delete_reply = asyncHandler(async (req, res) => {
  const { reply_id } = req.params;
  const user_id = req.loggedout?._id;

  if (!mongoose.isValidObjectId(reply_id)) {
    throw new ApiiError(400, "A valid reply ID is required");
  }

  const targetReply = await reply.findById(reply_id);
  if (!targetReply) {
    throw new ApiiError(404, "Reply not found");
  }

  if (String(targetReply.owner) !== String(user_id)) {
    throw new ApiiError(403, "You are not authorized to delete this reply");
  }

  await reply.findByIdAndDelete(reply_id);

  return res.status(200).json(new Api_response(200, {}, "Reply deleted successfully"));
});
const update_reply = asyncHandler(async (req, res) => {
  const { reply_id } = req.params;
  const { content } = req.body;
  const user_id = req.loggedout?._id;

  if (!mongoose.isValidObjectId(reply_id)) {
    throw new ApiiError(400, "A valid reply ID is required");
  }
  if (!content) {
    throw new ApiiError(400, "Content is required");
  }

  const targetReply = await reply.findById(reply_id);
  if (!targetReply) {
    throw new ApiiError(404, "Reply not found");
  }

  if (String(targetReply.owner) !== String(user_id)) {
    throw new ApiiError(403, "You are not authorized to update this reply");
  }

  targetReply.content = content;
  await targetReply.save();

  return res.status(200).json(new Api_response(200, targetReply, "Reply updated successfully"));
});
export {
  create_reply,
  delete_reply,
  update_reply,
  noof_likes,
  like_reply
}

