import { asyncHandler } from "../utils/async_handler.js";
import ApiiError from "../utils/Api_error.js";
import user from "../models/user.model.js";
import jwt from "jsonwebtoken"
export const varifyJWT=asyncHandler(async(req,res,next)=>{
  try {
    const token= req.cookies?.accesstoken|| req.header("Authorization")?.replace("Bearer ","");
    if(!token){
      throw new ApiiError(401,"Unauthorised request");
    }
    const decoded_info= jwt.verify(token,process.env.ACCESS_TOKEN_SECRET);
    const to_be_logged_out=await user.findById(decoded_info?._id).select(
      "-password -refreshToken"
    )
    if(!to_be_logged_out){
      //next video=discuss aboyt frontend
      throw new ApiiError(401,"Invalid AccessToken")
    }
    req.loggedout=to_be_logged_out;
    next();
  } catch (error) {
    throw new ApiiError(401,error?.message || "invalid accesstoken")
  }
})