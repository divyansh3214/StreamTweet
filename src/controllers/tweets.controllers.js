import mongoose from 'mongoose';
import { asyncHandler } from '../utils/async_handler.js';
import { tweet } from '../models/tweet.model.js';
import ApiiError from '../utils/Api_error.js';
import apiresponse from '../utils/Api_response.js';
import user from '../models/user.model.js';
const createTweet = asyncHandler(async (req, res) => {
  const content = req.body.content?.trim();
  const userId = req.loggedoutuser?._id;

  if (!content) {
    throw new ApiiError(400, 'Content is required');
  }

  if (!userId) {
    throw new ApiiError(401, 'User not authenticated');
  }

  const userExist = await user.findById(userId);
  if (!userExist) {
    throw new ApiiError(404, 'User not found');
  }

  const newTweet = await tweet.create({
    content,
    owner: userId
  });

  return res.status(201).json(new apiresponse(201, newTweet, 'Tweet created successfully'));
});
const getuserTweets = asyncHandler(async (req, res) => {
  const userid = req.params.userid || req.query.userid;
  const { page = 1, limit = 10 } = req.query;

  if (!userid) {
    throw new ApiiError(400, 'userid is required');
  }

  const userExist = await user.findById(userid);
  if (!userExist) {
    throw new ApiiError(404, 'User not found');
  }

 const pageNumber = Math.max(1, Number.parseInt(page, 10) || 1);
 const pageLimit = Math.min(50, Math.max(1, Number.parseInt(limit, 10) || 10));
 const tweets=await tweet.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userid)
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
    {
      $sort: { createdAt: -1 } // Sort by creation date, newest first
    },
    {
      $skip: (pageNumber - 1) * pageLimit
    },
    {
      $limit: pageLimit
    }
  ]);   
  return res.status(200).json(new apiresponse(200, tweets, 'User tweets fetched successfully'));
});
const deleteTweet = asyncHandler(async (req, res) => {
  const { tweetid } = req.params;
  const userId = req.loggedoutuser?._id;

  if (!tweetid) {
    throw new ApiiError(400, 'tweetid is required');
  }

  if (!userId) {
    throw new ApiiError(401, 'User not authenticated');
  }

  const tweetExist = await tweet.findById(tweetid);
  if (!tweetExist) {
    throw new ApiiError(404, 'Tweet not found');
  }

  if (tweetExist.owner.toString() !== userId.toString()) {
    throw new ApiiError(403, 'You are not authorized to delete this tweet');
  }

  await tweet.findByIdAndDelete(tweetid);

  return res.status(200).json(new apiresponse(200, null, 'Tweet deleted successfully'));
});
const updateTweet = asyncHandler(async (req, res) => {
  const { tweetid } = req.params;
  const { content } = req.body;
  const userId = req.loggedoutuser?._id;

  if (!tweetid) {
    throw new ApiiError(400, 'tweetid is required');
  }

  if (!content) {
    throw new ApiiError(400, 'Content is required');
  }

  if (!userId) {
    throw new ApiiError(401, 'User not authenticated');
  }

  const tweetExist = await tweet.findById(tweetid);
  if (!tweetExist) {
    throw new ApiiError(404, 'Tweet not found');
  }

  if (tweetExist.owner.toString() !== userId.toString()) {
    throw new ApiiError(403, 'You are not authorized to update this tweet');
  }

  tweetExist.content = content;
  await tweetExist.save();

  return res.status(200).json(new apiresponse(200, tweetExist, 'Tweet updated successfully'));
});

export { createTweet, getuserTweets, deleteTweet, updateTweet };