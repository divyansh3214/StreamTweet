import {Router} from "express";
import {registeruser} from "../controllers/user.conrollers.js";
import upload from "../middlewares/multer.middleware.js";
import userlogin from "../controllers/user_login_controller.js";
import { varifyJWT } from "../middlewares/auth.middleware.js";
import logoutuser from "../controllers/user_logout.js";
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
export default router;