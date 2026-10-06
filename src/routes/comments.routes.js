//export { getvideocomments, addcomment, deletecomment, updatecomment };
import {Router} from "express";
import { getvideocomments, addcomment, deletecomment, updatecomment } from "../controllers/comments.controlers.js";
import { varifyJWT } from "../middlewares/auth.middleware.js";

const router=Router();

router.route("/get-video-comments/:videoid").get(varifyJWT,getvideocomments);
router.route("/add-comment/:videoid").post(varifyJWT,addcomment);
router.route("/delete-comment/:commentid").delete(varifyJWT,deletecomment);
router.route("/update-comment/:commentid").put(varifyJWT,updatecomment);

export default router;