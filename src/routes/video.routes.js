import {Router} from "express";
import {registeruser} from "../controllers/user.conrollers.js";
import upload from "../middlewares/multer.middleware.js";
import { varifyJWT } from "../middlewares/auth.middleware.js";
const router=Router();
router.route("/upload-video").post(varifyJWT,upload.fields([
    {
        name:"videofile",
        maxCount:1
    },
    {
        name:"thumbnail",
        maxCount:1
    }
]),publishvideo)
export default router;