import { asyncHandler } from "../utils/async_handler.js";
import ApiiError from "../utils/Api_error.js";
import user from "../models/user.model.js";
import bcrypt from "bcryptjs";
import uploadoncloudinary from "../utils/cloudinary.js";
import apiresponse from "../utils/Api_response.js"
const registeruser = asyncHandler(async (req, res) => {
// get user details from frontend
// validate user details (not empty)
// check if user already exists (username or email)
// check for image and avatar
// upload avatar to cloudinary and get the URL
// create user object for saving in MongoDB
// save user in database
// remove password and refresh token fields from response
// check for successful user creation
// return response or throw error

    const { fullname, email, username, password } = req.body;

    if ([fullname, email, username, password].some(field => field?.trim() === "")) {
        throw new ApiiError(400, "All fields required");
    }

    const existedUser = await user.findOne({
        $or: [{ username }, { email }]
    });

    if (existedUser) {
        throw new ApiiError(409, "User already exists");
    }
    const avatar_localpath=req.files?.avatar[0]?.path;
    // const cover_images=req.files?.coverImage[0]?.path;
    let cover_images;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length>0){
        cover_images=req.files.coverImage[0]?.path;
    }
    if(!avatar_localpath){
        throw new ApiiError(400,"Avatar file required")
    }
    const avatar=await uploadoncloudinary(avatar_localpath);
    const coverimg=await uploadoncloudinary(cover_images);
    if(!avatar){
       throw new ApiiError(400,"Avatar file is required")
    }
    const user1=await user.create({
        fullname,
        avatar:avatar.url,
        coverimage:coverimg?.url || "",
        email,
        username:username.toLowerCase(),
        password
    });
   const createduser= await user.findById(user1._id).select(
    "-password -refreshToken"
   );
   if(!createduser){
     throw new ApiiError(500,"Something went wrong while registering User")
   }
   return res.status(201).json(
        new apiresponse(200,createduser,"user registered successfully")
   )

});

export { registeruser };
