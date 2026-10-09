import mongoose from "mongoose";
import { reply } from "../models/reply.models.js";
import { comments } from "../models/comments.model.js";
import { tweet } from "../models/tweet.model.js";
import { asyncHandler } from "../utils/async_handler.js";
import Api_response from "../utils/Api_response.js";
import ApiiError from "../utils/Api_error.js";
const create_reply = asyncHandler(async (req, res) => {
  const { comment_id } = req.params;
  const content = req.body.content?.trim();

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

const get_comment_replies = asyncHandler(async (req, res) => {
  const { comment_id } = req.params;

  if (!mongoose.isValidObjectId(comment_id)) {
    throw new ApiiError(400, "A valid comment ID is required");
  }
  if (!(await comments.exists({ _id: comment_id }))) {
    throw new ApiiError(404, "Comment not found");
  }

  const commentReplies = await reply
    .find({ comment: comment_id, replyTo: { $exists: false } })
    .populate("owner", "username fullname avatar")
    .sort({ createdAt: -1 });

  return res
    .status(200)
    .json(new Api_response(200, commentReplies, "Comment replies fetched successfully"));
});

const create_tweet_reply = asyncHandler(async (req, res) => {
  const { tweet_id } = req.params;
  const content = req.body.content?.trim();
  const user_id = req.loggedout?._id;

  if (!mongoose.isValidObjectId(tweet_id)) {
    throw new ApiiError(400, "A valid tweet ID is required");
  }
  if (!content) {
    throw new ApiiError(400, "Reply content is required");
  }
  if (!user_id) {
    throw new ApiiError(401, "User ID required");
  }
  if (!(await tweet.exists({ _id: tweet_id }))) {
    throw new ApiiError(404, "Tweet not found");
  }

  const createdReply = await reply.create({
    content,
    owner: user_id,
    tweet: tweet_id,
  });

  return res
    .status(201)
    .json(new Api_response(201, createdReply, "Tweet reply added successfully"));
});

const get_tweet_replies = asyncHandler(async (req, res) => {
  const { tweet_id } = req.params;

  if (!mongoose.isValidObjectId(tweet_id)) {
    throw new ApiiError(400, "A valid tweet ID is required");
  }

  if (!(await tweet.exists({ _id: tweet_id }))) {
    throw new ApiiError(404, "Tweet not found");
  }

  const tweetReplies = await reply
    .find({ tweet: tweet_id, replyTo: { $exists: false } })
    .populate("owner", "username fullname avatar")
    .sort({ createdAt: -1 });

  return res
    .status(200)
    .json(new Api_response(200, tweetReplies, "Tweet replies fetched successfully"));
});

const create_reply_to_reply = asyncHandler(async (req, res) => {
  const { reply_id } = req.params;
  const content = req.body.content?.trim();
  const user_id = req.loggedout?._id;

  if (!mongoose.isValidObjectId(reply_id)) {
    throw new ApiiError(400, "A valid reply ID is required");
  }
  if (!content) {
    throw new ApiiError(400, "Reply content is required");
  }
  if (!user_id) {
    throw new ApiiError(401, "User ID required");
  }

  const parentReply = await reply.findById(reply_id).select("comment tweet");
  if (!parentReply) {
    throw new ApiiError(404, "Reply not found");
  }

  const nestedReply = await reply.create({
    content,
    owner: user_id,
    comment: parentReply.comment,
    tweet: parentReply.tweet,
    replyTo: parentReply._id,
  });

  return res
    .status(201)
    .json(new Api_response(201, nestedReply, "Reply added successfully"));
});

const get_reply_replies = asyncHandler(async (req, res) => {
  const { reply_id } = req.params;

  if (!mongoose.isValidObjectId(reply_id)) {
    throw new ApiiError(400, "A valid reply ID is required");
  }
  if (!(await reply.exists({ _id: reply_id }))) {
    throw new ApiiError(404, "Reply not found");
  }

  const nestedReplies = await reply
    .find({ replyTo: reply_id })
    .populate("owner", "username fullname avatar")
    .sort({ createdAt: -1 });

  return res
    .status(200)
    .json(new Api_response(200, nestedReplies, "Replies fetched successfully"));
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

  const [replyTree] = await reply.aggregate([
    { $match: { _id: targetReply._id } },
    {
      $graphLookup: {
        from: reply.collection.name,
        startWith: "$_id",
        connectFromField: "_id",
        connectToField: "replyTo",
        as: "descendants",
      },
    },
    {
      $project: {
        ids: {
          $concatArrays: [
            ["$_id"],
            { $map: { input: "$descendants", as: "descendant", in: "$$descendant._id" } },
          ],
        },
      },
    },
  ]);

  await reply.deleteMany({ _id: { $in: replyTree.ids } });

  return res.status(200).json(new Api_response(200, {}, "Reply and its nested replies deleted successfully"));
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
  get_comment_replies,
  create_tweet_reply,
  get_tweet_replies,
  create_reply_to_reply,
  get_reply_replies,
  delete_reply,
  update_reply,
  noof_likes,
  like_reply
}
