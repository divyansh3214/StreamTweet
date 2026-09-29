import { asyncHandler } from "../utils/async_handler.js";
import ApiiError from "../utils/Api_error.js";
import user from "../models/user.model.js";
import apiresponse from "../utils/Api_response.js";
import jwt from "jsonwebtoken";
import uploadoncloudinary from "../utils/cloudinary.js";
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
  const { email, username, password } = req.body;

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
  const incomingtoken=req.cookies.refreshToken || req.body.refreshToken;
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
const updationoffilesavatar=asyncHandler(async(req,res)=>{
  const avatar=req.file?.path;
  if(!avatar){
    throw new ApiiError(403,"avatar file missing");
  }
  const response1=await uploadoncloudinary(avatar);
  if(!response1.url){
    throw new ApiiError(404,"error while uploading")
  }
  const USER=user.findById(req.loggedout?._id);
  if(!USER){
    throw ApiiError(401,"retry again");
  }
  USER.avatar=response1.url;
  await USER.save({validateBeforeSave:false})
  const response2=USER.toObject();
  delete response2.password;
  delete response2.refreshToken;
})
export { refreshaccesstoken,changecurrentuserpassword,getcurrentuser,updateotherdetails,updationoffilesavatar};
export default userlogin;
