import {Router} from "express";
import {registeruser} from "../controllers/user.conrollers.js";
import upload from "../middlewares/multer.middleware.js";
import { varifyJWT } from "../middlewares/auth.middleware.js";
import { publishvideo } from "../controllers/video.controllers.js";
import { getallvideos } from "../controllers/video.controllers.js";
import { deletevideo, getvideobyid, updatevideo, toglepublishstatus } from "../controllers/video.controllers.js";
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
router.route("/get-all-videos").get(varifyJWT,getallvideos);
router.route("/get-video/:videoid").get(varifyJWT,getvideobyid);
router.route("/update-video/:videoid").put(varifyJWT,upload.fields([
    {
        name:"thumbnail",
        maxCount:1
    }
]),updatevideo);
router.route("/delete-video/:videoid").delete(varifyJWT,deletevideo);
router.route("/toggle-publish-status/:videoid").put(varifyJWT,toglepublishstatus);
export default router;