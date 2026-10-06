import {Router} from "express";
import {registeruser} from "../controllers/user.conrollers.js";
import upload from "../middlewares/multer.middleware.js";
import userlogin from "../controllers/user_login_controller.js";
import { varifyJWT } from "../middlewares/auth.middleware.js";
import logoutuser from "../controllers/user_logout.js";
import { refreshaccesstoken } from "../controllers/user_login_controller.js";
import { getcurrentuser } from "../controllers/user_login_controller.js";
import { changecurrentuserpassword } from "../controllers/user_login_controller.js";
import { updateotherdetails } from "../controllers/user_login_controller.js";
import { updationoffilesavatar } from "../controllers/user_login_controller.js";
import { getuserchannel_profile } from "../controllers/user_login_controller.js";
import { getwatch_history } from "../controllers/user_login_controller.js";
const router=Router();
router.route("/register").post(
    upload.fields([
        {
           name:"avatar",
           maxCount:1  
        },
        {
            name:"coverImage",
            maxCount:1
        }
    ]),
    registeruser
)
router.route("/login").post(userlogin)
router.route("/logout").post(varifyJWT,logoutuser);
router.route("/refresh-token").post(refreshaccesstoken);
router.route("/get-current-user").get(varifyJWT,getcurrentuser);
router.route("/change-password").put(varifyJWT,changecurrentuserpassword);
router.route("/update-other-details").put(varifyJWT,updateotherdetails);
router.route("/update-avatar").put(varifyJWT,upload.single("avatar"),updationoffilesavatar);
router.route("/channel-profile/:username").get(varifyJWT,getuserchannel_profile);
router.route("/watch-history").get(varifyJWT,getwatch_history);
export default router;