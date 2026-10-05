import mongoose from "mongoose";
import ApiiError from "../utils/ApiError.js"; // ensure correct default/named export
import asyncHandler from "express-async-handler";
import likes from "../models/likes.model.js"; // ensure default export
import apiresponse from "../utils/ApiResponse.js";

const togglevideolike = asyncHandler(async (req, res) => {
  const { videoid } = req.params;
  if (!videoid) {
    throw new ApiiError(400, "videoid is required");
  }

  const userId = req.loggedoutuser?._id; 
  if (!userId) {
    throw new ApiiError(401, "User not authenticated");
  }

  const existingLike = await likes.findOne({
    video: videoid,
    likedby: userId
  });

  if (existingLike) {
    await likes.findByIdAndDelete(existingLike._id);
  } else {
    // Like (add)
    await likes.create({
      video: videoid,
      likedby: userId
    });
  }

  // Get updated total likes with user details
  const totallikes = await likes.aggregate([
    {
      $match: {
        video: mongoose.Types.ObjectId(videoid)
      }
    },
    {
      $lookup: {
        from: "users",
        localField: "likedby",
        foreignField: "_id",
        as: "likeddetails",
        pipeline: [
          {
            $project: {
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
        likeddetails: { $arrayElemAt: ["$likeddetails", 0] }
      }
    }
  ]);

  return res
    .status(200)
    .json(new apiresponse(200, { count: totallikes.length, likes: totallikes }, "Like toggled successfully"));
});
const toggleCommentlike = asyncHandler(async (req, res) => {
  const { commentid } = req.params;
  if (!commentid) {
    throw new ApiiError(400, "commentid is required");
  }

  const userId = req.loggedoutuser?._id; 
  if (!userId) {
    throw new ApiiError(401, "User not authenticated");
  }

  const existingLike = await likes.findOne({
    comment: commentid,
    likedby: userId
  });

  if (existingLike) {
    await likes.findByIdAndDelete(existingLike._id);
  } else {
    // Like (add)
    await likes.create({
      comment: commentid,
      likedby: userId
    });
  }

  // Get updated total likes with user details
  const totallikes = await likes.aggregate([
    {
      $match: {
        comment: mongoose.Types.ObjectId(commentid)
      }
    },
    {
      $lookup: {
        from: "users",
        localField: "likedby",
        foreignField: "_id",
        as: "likeddetails",
        pipeline: [
          {
            $project: {
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
        likeddetails: { $arrayElemAt: ["$likeddetails", 0] }
      }
    }
  ]);

  return res
    .status(200)
    .json(new apiresponse(200, { count: totallikes.length, likes: totallikes }, "Like toggled successfully"));
});
const toggleTweetlike = asyncHandler(async (req, res) => {
  const { tweetid } = req.params;
  if (!tweetid) {
    throw new ApiiError(400, "tweetid is required");
  }

  const userId = req.loggedoutuser?._id; 
  if (!userId) {
    throw new ApiiError(401, "User not authenticated");
  }

  const existingLike = await likes.findOne({
    tweet: tweetid,
    likedby: userId
  });

  if (existingLike) {
    await likes.findByIdAndDelete(existingLike._id);
  } else {
    // Like (add)
    await likes.create({
      tweet: tweetid,
      likedby: userId
    });
  }

  // Get updated total likes with user details
  const totallikes = await likes.aggregate([
    {
      $match: {
        tweet: mongoose.Types.ObjectId(tweetid)
      }
    },
    {
      $lookup: {
        from: "users",
        localField: "likedby",
        foreignField: "_id",
        as: "likeddetails",
        pipeline: [
          {
            $project: {
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
        likeddetails: { $arrayElemAt: ["$likeddetails", 0] }
      }
    }
  ]);

  return res
    .status(200)
    .json(new apiresponse(200, { count: totallikes.length, likes: totallikes }, "Like toggled successfully"));
});
const getalllikedvideobyuser=asyncHandler(async(req,res)=>{
    const userId=req.loggedoutuser?._id;
    if(!userId){
        throw new ApiiError(401,"User not authenticated");
    }
    const allvideos=await likes.aggregate([
        {
            $match:{
                likedby:mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup:{
                from:"videos",
                localField:"video",
                foreignField:"_id",
                as:"videodetails"
            }
        },
        {
            $addFields:{
                videodetails:{$arrayElemAt:["$videodetails",0]}
            }
        }
    ]);
    return res
    .status(200)
    .json(new apiresponse(200, { videos: allvideos }, "Liked videos retrieved successfully"));
});
export { togglevideolike, toggleCommentlike , toggleTweetlike, getalllikedvideobyuser};

