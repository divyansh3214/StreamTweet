import express from "express";
import { createPlaylist, getplaylistbyid, getuserplaylists,updateplaylist,deleteplaylist} from "../controllers/playlists.controllers.js";
import { varifyJWT } from "../middlewares/auth.middleware.js";

const router=express.Router();

router.route("/create-playlist").post(varifyJWT,createPlaylist);
router.route("/get-user-playlists/:userid").get(varifyJWT,getuserplaylists);
router.route("/get-playlist/:playlistid").get(varifyJWT,getplaylistbyid);
router.route("/update-playlist/:playlistid").put(varifyJWT,updateplaylist);
router.route("/delete-playlist/:playlistid").delete(varifyJWT,deleteplaylist);

export default router;