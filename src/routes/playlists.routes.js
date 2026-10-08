import express from "express";
import {
  addvideotoplaylist,
  createPlaylist,
  deleteplaylist,
  getplaylistbyid,
  getuserplaylists,
  removevideofromplaylist,
  updateplaylist,
} from "../controllers/playlists.controllers.js";
import { varifyJWT } from "../middlewares/auth.middleware.js";

const router=express.Router();

router.route("/create-playlist").post(varifyJWT,createPlaylist);
router.route("/get-user-playlists/:userid").get(varifyJWT,getuserplaylists);
router.route("/get-playlist/:playlistid").get(varifyJWT,getplaylistbyid);
router.route("/update-playlist/:playlistid").put(varifyJWT,updateplaylist);
router.route("/delete-playlist/:playlistid").delete(varifyJWT,deleteplaylist);
router.route("/add-video/:playlistid/:videoid").post(varifyJWT,addvideotoplaylist);
router.route("/remove-video/:playlistid/:videoid").delete(varifyJWT,removevideofromplaylist);

export default router;