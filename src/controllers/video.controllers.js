import ApiiError from "../utils/Api_error.js";
import asyncHandler  from "../utils/async_handler.js";
import apiresponse from "../utils/Api_response.js";
import user from "../models/user.model.js";
import uploadoncloudinary from "../utils/cloudinary.js";
import { deleteoncloudinary } from "../utils/cloudinary.js";
import video from "../models/video.model.js";
const getallvideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, userid, query, sortBy, sortType } = req.query;

  if (!userid) {
    throw new ApiiError(400, "userid is required");
  }

  const userexist = await user.findById(userid);
  if (!userexist) {
    throw new ApiiError(404, "user not found");
  }

  // Build aggregation pipeline
  const pipeline = [
    { $match: { _id: userexist._id } },
    {
      $lookup: {
        from: "videos",
        localField: "_id",
        foreignField: "owner",
        as: "videos",
        pipeline: [
          // Search filter
          ...(query ? [{
            $match: {
              $or: [
                { title: { $regex: query, $options: "i" } },
                { description: { $regex: query, $options: "i" } }
              ]
            }
          }] : []),

          // Owner details lookup
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "ownerdetails",
              pipeline: [
                { $project: { username: 1, fullname: 1, avatar: 1, coverImage: 1 } }
              ]
            }
          },
          { $addFields: { ownerdetails: { $arrayElemAt: ["$ownerdetails", 0] } } },

          // Sorting
          ...(sortBy ? [{
            $sort: { [sortBy]: sortType === "desc" ? -1 : 1 }
          }] : [])
        ]
      }
    }
  ];

  const options = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10)
  };

  const videolistthroughuser = await user.aggregatePaginate(user.aggregate(pipeline), options);

  return res.status(200).json(new apiresponse(200, videolistthroughuser, "videos fetched successfully"));
});

const publishvideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body; // ✅ use body

  if (!title || !description) {
    throw new ApiiError(400, "title and description are required");
  }

  if (!req.files || !req.files.videofile || !req.files.thumbnail) {
    throw new ApiiError(400, "video file and thumbnail are required");
  }

  const videofile = req.files.videofile[0];
  const thumbnail = req.files.thumbnail[0];

  const thumbnailupload = await uploadoncloudinary(thumbnail.path);
  const uploadedvideo = await uploadoncloudinary(videofile.path);

  if (!uploadedvideo || !thumbnailupload) {
    throw new ApiiError(500, "failed to upload video or thumbnail on cloudinary");
  }

  const newvideo = await video.create({
    videofile: uploadedvideo.secure_url,
    thumbnail: thumbnailupload.secure_url,
    title,
    description,
    duration: uploadedvideo.duration || null,
    owner: req.loggedoutuser?._id
  });

  if (!newvideo) {
    throw new ApiiError(500, "failed to create video");
  }
  return res.status(200).json(new apiresponse(200, newvideo, "video uploaded successfully"));
});

const deletevideo = asyncHandler(async (req, res) => {
  const { videoid } = req.params;

  if (!videoid) {
    throw new ApiiError(400, "videoid is required");
  }

  const videodetails = await video.findById(videoid);

  if (!videodetails) {
    throw new ApiiError(404, "video not found");
  }

  if (videodetails.owner.toString() !== req.loggedoutuser?._id.toString()) {
    throw new ApiiError(403, "you are not authorized to delete this video");
  }

  await deleteoncloudinary(videodetails.videofile);
  await deleteoncloudinary(videodetails.thumbnail);
  await videodetails.remove();

  return res.status(200).json(new apiresponse(200, null, "video deleted successfully"));
});

const getvideobyid=asyncHandler(async(req,res)=>{
    const videoid=req.params;
    if(!videoid){
        throw new ApiiError(400,"videoid is required")
    }
    const videodetails = await video.aggregate([
  {
    $match: {
      _id: new mongoose.Types.ObjectId(videoid)
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
  }
]);

if (!videodetails.length) {
  throw new ApiiError(404, "video not found");
}

return res
  .status(200)
  .json(new apiresponse(200, videodetails[0], "video details fetched successfully"));

})
const updatevideo = asyncHandler(async (req, res) => {
  const { videoid } = req.params;
  const { title, description } = req.body;
  const thumbnail = req.files?.thumbnail?.[0]?.path;
  if (!videoid) {
    throw new ApiiError(400, "videoid is required");
  }
  if (!title && !description && !thumbnail) {
    throw new ApiiError(400, "at least one field is required to update");
  }
  const videoDoc = await video.findById(videoid);
  if (!videoDoc) {
    throw new ApiiError(404, "video not found");
  }
  if (videoDoc.owner.toString() !== req.loggedoutuser?._id?.toString()) {
    throw new ApiiError(403, "you are not authorized to update this video");
  }
  let newThumbnailUrl = videoDoc.thumbnail;
  if (thumbnail) {
    const response = await uploadoncloudinary(thumbnail);
    if (!response?.secure_url) {
      throw new ApiiError(500, "failed to upload thumbnail on cloudinary");
    }
    await deleteoncloudinary(videoDoc.thumbnail);
    newThumbnailUrl = response.secure_url;
  }

  videoDoc.title = title || videoDoc.title;
  videoDoc.description = description || videoDoc.description;
  videoDoc.thumbnail = newThumbnailUrl;

  await videoDoc.save();

  return res.status(200).json(
    new apiresponse(200, videoDoc, "video updated successfully")
  );
});

export {getallvideos, publishvideo, deletevideo, getvideobyid, updatevideo};

