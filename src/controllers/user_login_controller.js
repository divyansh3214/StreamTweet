import { asyncHandler } from "../utils/async_handler.js";
import ApiiError from "../utils/Api_error.js";
import user from "../models/user.model.js";
import apiresponse from "../utils/Api_response.js";

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
export default userlogin;
