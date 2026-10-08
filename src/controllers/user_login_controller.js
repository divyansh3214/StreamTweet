import { asyncHandler } from "../utils/async_handler.js";
import mongoose from "mongoose";
import ApiiError from "../utils/Api_error.js";
import user from "../models/user.model.js";
import video from "../models/video.model.js";
import { playlist } from "../models/playlist.model.js";
import { tweet } from "../models/tweet.model.js";
import apiresponse from "../utils/Api_response.js";
import jwt from "jsonwebtoken";
import uploadoncloudinary from "../utils/cloudinary.js";
import { deleteoncloudinary } from "../utils/cloudinary.js";
const generateaccessandrefreshtoken = async (findeduser) => {
  try {
    const accessToken = await findeduser.generateAccessToken();
    const refreshToken = await findeduser.generateRefreshToken();

    findeduser.refreshToken = refreshToken;
    await findeduser.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (err) {
    throw new ApiiError(501, "Something went wrong, try again later");
  }
};

const userlogin = asyncHandler(async (req, res) => {
  const { email, username, password } = req.body || {};

  if (!email && !username) {
    throw new ApiiError(400, "Username or email required");
  }

  const finduser = await user.findOne({
    $or: [{ username }, { email }]
  });

  if (!finduser) {
    throw new ApiiError(401, "User not found. Kindly register");
  }

  const isvaluecorrect = await finduser.isPasswordCorrect(password);
  if (!isvaluecorrect) {
    throw new ApiiError(403, "Password is incorrect");
  }

  // Generate tokens using the already-fetched user
  const { accessToken, refreshToken } = await generateaccessandrefreshtoken(finduser);

  // Prepare safe response object
  const safeUser = finduser.toObject();
  delete safeUser.password;
  delete safeUser.refreshToken;
  const options={
    httpOnly:true,
    secure:true
  }
  return res.status(200).cookie("accesstoken",accessToken,options).cookie("refreshtoken",refreshToken,options).
  json(
    new apiresponse(
        200,
        {
          loggeduser:safeUser,
          accessToken,
          refreshToken
        },
        "User loggedin successfully"
    )
  )
})
const refreshaccesstoken=asyncHandler(async(req,res)=>{
  const incomingtoken=req.cookies?.refreshtoken || req.body?.refreshToken;
  if(!incomingtoken){
    throw new ApiiError(401,"Unauthorised Access");
  }
  try {
    const decoded_token=jwt.verify(incomingtoken,process.env.REFRESH_TOKEN_SECRET);
    if(!decoded_token){
      throw new ApiiError(402,"not authorised");
    }
    const databasefind=await user.findById(decoded_token?._id);
    if(!databasefind){
      throw new ApiiError(403,"Unauthorised request");
    }
    if(incomingtoken!==databasefind?.refreshToken){
       throw new ApiiError(403,"refresh token expired or used");
    }
  const options={
    httpOnly:true,
    secure:true,
  }
  const newtokens=await generateaccessandrefreshtoken(databasefind)
  return res.status(200).
  cookie("accesstoken",newtokens.accessToken,options).
  cookie("refreshtoken",newtokens.refreshToken,options).
  json(
    new apiresponse(
      200,
      {
        accessToken: newtokens.accessToken,
        refreshToken:newtokens.refreshToken,
        message:"Accesstoken refreshed"
      }
    )
  )
  } catch (error) {
    throw new ApiiError(501,"unexpected error")
  }
})
const changecurrentuserpassword=asyncHandler(async(req,res)=>{
  const {oldpassword,newpassword}=req.body;
  const USER=await user.findById(req.loggedout?._id);
  if(! await USER.isPasswordCorrect(oldpassword)){
    throw new ApiiError(400,"incorrect old password");
  }
  USER.password=newpassword
  await USER.save({validateBeforeSave:false})
  return res.status(200).json(
    new apiresponse(200,{},"password changed successfullly")
  )
})
const getcurrentuser=asyncHandler(async(req,res)=>{
  return res.status(200).json(
  new apiresponse(200, req.loggedout, "current user fetched successfully")
);
})
const updateotherdetails=asyncHandler(async(req,res)=>{
  const {fullname,email}=req.body;
  if(!fullname && !email){
    throw new ApiiError(403,"Kindly fill all details")
  }
  const USER=await user.findById(req.loggedout?._id);
  if(!USER){
    throw new ApiiError(402,"User not existed");
  }
  USER.fullname=fullname;
  USER.email=email;
  await USER.save({validateBeforeSave:false});
  const returningvalues = USER.toObject();
  delete returningvalues.password;
  delete returningvalues.refreshToken;
  return res.status(200).json(
  new apiresponse(200, returningvalues, "details changed successfully")
);
})
const updationoffilesavatar = asyncHandler(async (req, res) => {
  const avatar = req.file?.path;
  if (!avatar) {
    throw new ApiiError(403, "avatar file missing");
  }
  const response1 = await uploadoncloudinary(avatar);
  if (!response1?.url) {
    throw new ApiiError(404, "error while uploading");
  }
  const USER = await user.findById(req.loggedout?._id);
  if (!USER) {
    throw new ApiiError(401, "retry again");
  }
  const oldfileurl = USER.avatar;
  if (oldfileurl) {
    const deletionResult = await deleteoncloudinary(oldfileurl);
    if (!deletionResult || deletionResult.result !== "ok") {
      throw new ApiiError(501, "old avatar not deleted");
    }
  }
  USER.avatar = response1.url;
  await USER.save({ validateBeforeSave: false });
  const response2 = USER.toObject();
  delete response2.password;
  delete response2.refreshToken;
  return res.status(200).json(
    new apiresponse(200, response2, "Updation successfully")
  );
});
const getuserchannel_profile=asyncHandler(async(req,res)=>{
    const {username}=req.params;
    if(!username?.trim()){
      throw new ApiiError(403,"username required");
    }
   const channel=await user.aggregate([
     {
        $match:{
         username:username?.toLowerCase()
        }
     },
     {
       $lookup:{
          from:"subscriptions",
          localField:"_id",
          foreignField:"channels",
          as:"subscribers"
        }
     },
     {
       $lookup:{
          from:"subscriptions",
          localField:"_id",
          foreignField:"subscriber",
          as:"subscribedchannels"
       }
     },
     {
       $addFields:{
         subscriberscount:{$size:"$subscribers"},
         subscribedchannelscount:{$size:"$subscribedchannels"},
         issubscribed:{$in:[req.loggedout?._id,"$subscribers.subscriber"]}
       }
     },
     {
      $project:{
       subscriberscount:1,
       subscribedchannelscount:1,
       issubscribed:1,
       username:1,
       fullname:1,
       avatar:1,
       coverImage:1
      }
     }
   ])
   if(!channel?.length){
    throw new ApiiError(404,"channel not found");
   }
   const channelProfile = channel[0];
   const isOwnChannel = String(channelProfile._id) === String(req.loggedout?._id);
   const channelVideos = await video.find({
     owner: channelProfile._id,
     ...(isOwnChannel ? {} : { isPublished: true })
   }).sort({ createdAt: -1 }).lean();
   const visibleVideoIds = new Set(channelVideos.map((channelVideo) => String(channelVideo._id)));
   const channelPlaylists = await playlist.find({ owner: channelProfile._id })
     .select("_id name description videos createdAt")
     .sort({ createdAt: -1 })
     .lean();
   const channelTweets = await tweet.find({ owner: channelProfile._id })
     .sort({ createdAt: -1 })
     .limit(50)
     .populate({
       path: "video",
       select: "title thumbnail owner isPublished"
     })
     .lean();
   const visibleChannelTweets = channelTweets.map((channelTweet) => ({
       ...channelTweet,
       ownerdetails: {
         _id: channelProfile._id,
         username: channelProfile.username,
         fullname: channelProfile.fullname,
         avatar: channelProfile.avatar,
       },
       video: channelTweet.video && (isOwnChannel || channelTweet.video.isPublished)
         ? {
             _id: channelTweet.video._id,
             title: channelTweet.video.title,
             thumbnail: channelTweet.video.thumbnail,
             owner: channelTweet.video.owner,
           }
         : null
     }));
   const videosWithOwner = channelVideos.map((channelVideo) => ({
     ...channelVideo,
     ownerdetails: {
       _id: channelProfile._id,
       username: channelProfile.username,
       fullname: channelProfile.fullname,
       avatar: channelProfile.avatar,
     }
   }));
   return res.status(200).json(new apiresponse(200, {
     ...channelProfile,
     videos: videosWithOwner,
     tweets: visibleChannelTweets,
     playlists: channelPlaylists.map((channelPlaylist) => ({
       ...channelPlaylist,
       videos: channelPlaylist.videos
         .filter((videoId) => visibleVideoIds.has(String(videoId)))
         .map(String)
     }))
   }, "channel profile fetched successfully"));
});
const getwatch_history=asyncHandler(async(req,res)=>{
   const USER=await user.aggregate([
    {
      $match:{
        _id:new mongoose.Types.ObjectId(req.loggedout?._id)
      }
    },
    {
      $lookup:{
        from:"videos",
        localField:"watchhistory",
        foreignField:"_id",
        as:"History",
        pipeline:[
          {
            $lookup:{
              from:"users",
              localField:"owner",
              foreignField:"_id",
              as:"ownerdetails",
              pipeline:[
                {
                  $project:{
                    username:1,
                    fullname:1,
                    avatar:1,
                    coverImage:1
                  }
                }
              ]
            }
          },
          {
            $addFields:{
              ownerdetails:{$arrayElemAt:["$ownerdetails",0]}
            }
          }
        ]

      }
    }
   ])
   return res.status(200).json(new apiresponse(200, USER[0].History, "Watch history fetched successfully"));
});
export { refreshaccesstoken,changecurrentuserpassword,getcurrentuser,updateotherdetails,updationoffilesavatar,getuserchannel_profile,getwatch_history};
export default userlogin;
