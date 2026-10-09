import mongoose from "mongoose";
import { reply } from "../models/reply.models.js";
import { comment } from "../models/comment.models.js";
import { user } from "../models/user.models.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import Api_response from "../utils/Api_response.js";
import ApiiError from "../utils/Api_error.js";
const create_reply=asyncHandler(async(req,res)=>{
   const {comment_id,content}=req.params;
   if(!comment_id){
     return ApiiError(402,"Write a comment"); 
   }
   const user_id=req.loggedout?._id;
   if(await user.findbyId())
   if(!user_id){
     throw new ApiError(405,"User id required");
   }
    const REPLY = await reply.create({
       content,
       owner: user_id,
       comment:comment_id,
    });
    return res.status(200).json(new Api_response(200,REPLY,"comment added successfully"));
})

const getliked_by=asyncHandler(async(req,res)=>{

})
const like_reply=asyncHandler(async(req,res)=>{

})
const delete_reply=asyncHandler(async(req,res)=>{

})
const update_reply=asyncHandler(async(req,res)=>{

})

