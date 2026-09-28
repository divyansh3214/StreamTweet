import { asyncHandler } from "../utils/async_handler.js";
import ApiiError from "../utils/Api_error.js";
import user from "../models/user.model.js";
import apiresponse from "../utils/Api_response.js"
const logoutuser=asyncHandler(async(req,res)=>{
  await user.findByIdAndUpdate(
    req.loggedout,
    {
        $set:{
            refreshToken:undefined
        }
    },
    {
        new:true
    }
)
    const options={
        httpOnly:true,
        secure:true
    }
    return res.status(200).clearCookie("accesstoken",options).clearCookie("refreshtoken",options).
    json(new apiresponse(200,{},"userloggedout"));

})
export default logoutuser;