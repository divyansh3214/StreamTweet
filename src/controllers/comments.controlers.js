import mongoose from "mongoose";
import comments from "../models/comments.model.js";
import ApiiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import apiresponse from "../utils/ApiResponse.js";

const getvideocomments = asyncHandler(async (req, res) => {
  const { videoid } = req.params;
  const { page = 1, limit = 10 } = req.query;

  if (!videoid) {
    throw new ApiiError(400, "videoid is required");
  }

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skipNum = (pageNum - 1) * limitNum;

  const result = await comments.aggregate([
    {
      $match: {
        video: mongoose.Types.ObjectId(videoid)
      }
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "ownerdetails",
        pipeline: [
          {
            $project: {
              username: 1,
              fullname: 1,
              avatar: 1,
              coverImage: 1
            }
          }
        ]
      }
    },
    {
      $addFields: {
        ownerdetails: { $arrayElemAt: ["$ownerdetails", 0] }
      }
    },
    { $skip: skipNum },
    { $limit: limitNum }
  ]);

  return res
    .status(200)
    .json(new apiresponse(200, result, "Comments fetched successfully"));
});
const addcomment = asyncHandler(async (req, res) => {
  const { videoid } = req.params;
  const { content } = req.body;

  if (!videoid) {
    throw new ApiiError(400, "videoid is required");
  }

  if (!content) {
    throw new ApiiError(400, "content is required");
  }

  const comment = await comments.create({
    content,
    owner: req.loggedoutuser?._id,
    video: videoid
  });

  return res
    .status(201)
    .json(new apiresponse(201, comment, "Comment added successfully"));
});
const deletecomment = asyncHandler(async (req, res) => {
  const { commentid } = req.params;

  if (!commentid) {
    throw new ApiiError(400, "commentid is required");
  }

  const commentdetails = await comments.findById(commentid);
  if (!commentdetails) {
    throw new ApiiError(404, "comment not found");
  }

  if (commentdetails.owner.toString() !== req.loggedoutuser?._id?.toString()) {
    throw new ApiiError(403, "You are not authorized to delete this comment");
  }

  await comments.findByIdAndDelete(commentid);

  return res
    .status(200)
    .json(new apiresponse(200, null, "Comment deleted successfully"));
});
const updatecomment = asyncHandler(async (req, res) => {
  const { commentid } = req.params;
  const { content } = req.body;

  if (!commentid) {
    throw new ApiiError(400, "commentid is required");
  }

  if (!content) {
    throw new ApiiError(400, "content is required");
  }

  const commentdetails = await comments.findById(commentid);
  if (!commentdetails) {
    throw new ApiiError(404, "comment not found");
  }

  if (commentdetails.owner.toString() !== req.loggedoutuser?._id?.toString()) {
    throw new ApiiError(403, "You are not authorized to update this comment");
  }

  commentdetails.content = content;
  await commentdetails.save();

  return res
    .status(200)
    .json(new apiresponse(200, commentdetails, "Comment updated successfully"));
});

export { getvideocomments, addcomment, deletecomment, updatecomment };

