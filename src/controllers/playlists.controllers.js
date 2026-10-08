import mongoose from "mongoose";
import { asyncHandler } from "../utils/async_handler.js";
import ApiiError from "../utils/Api_error.js";
import { playlist } from "../models/playlist.model.js";
import video from "../models/video.model.js";

const findOwnedPlaylist = async (req, playlistid) => {
  if (!mongoose.isValidObjectId(playlistid)) {
    throw new ApiiError(400, "valid playlist id is required");
  }
  const playlistdata = await playlist.findOne({
    _id: playlistid,
    owner: req.loggedoutuser._id,
  });
  if (!playlistdata) throw new ApiiError(404, "playlist not found");
  return playlistdata;
};

const createPlaylist = asyncHandler(async (req, res) => {
  const name = req.body.name?.trim();
  const description = req.body.description?.trim() || "";
  if (!name) throw new ApiiError(400, "playlist name is required");

  const playlistExist = await playlist.findOne({ name, owner: req.loggedoutuser._id });
  if (playlistExist) throw new ApiiError(400, "playlist already exists");

  const newPlaylist = await playlist.create({
    name,
    description,
    owner: req.loggedoutuser._id,
  });
  res.status(201).json({
    success: true,
    message: "playlist created successfully",
    data: newPlaylist,
  });
});

const getuserplaylists = asyncHandler(async (req, res) => {
  const { userid } = req.params;
  if (!mongoose.isValidObjectId(userid)) throw new ApiiError(400, "valid user id is required");
  if (String(userid) !== String(req.loggedoutuser._id)) {
    throw new ApiiError(403, "you are not authorized to view these playlists");
  }

  const playlists = await playlist.find({ owner: req.loggedoutuser._id }).sort({ createdAt: -1 });
  res.status(200).json({
    success: true,
    message: "playlists fetched successfully",
    data: playlists,
  });
});

const getplaylistbyid = asyncHandler(async (req, res) => {
  const playlistdata = await findOwnedPlaylist(req, req.params.playlistid);
  await playlistdata.populate("videos");
  res.status(200).json({
    success: true,
    message: "playlist fetched successfully",
    data: playlistdata,
  });
});

const addvideotoplaylist = asyncHandler(async (req, res) => {
  const playlistdata = await findOwnedPlaylist(req, req.params.playlistid);
  if (!mongoose.isValidObjectId(req.params.videoid)) throw new ApiiError(400, "valid video id is required");
  const videoExists = await video.exists({ _id: req.params.videoid });
  if (!videoExists) throw new ApiiError(404, "video not found");
  if (playlistdata.videos.some((id) => id.equals(req.params.videoid))) {
    throw new ApiiError(400, "video already exists in playlist");
  }
  playlistdata.videos.push(req.params.videoid);
  await playlistdata.save();
  res.status(200).json({
    success: true,
    message: "video added to playlist successfully",
    data: playlistdata,
  });
});

const removevideofromplaylist = asyncHandler(async (req, res) => {
  const playlistdata = await findOwnedPlaylist(req, req.params.playlistid);
  if (!mongoose.isValidObjectId(req.params.videoid)) throw new ApiiError(400, "valid video id is required");
  const videoIndex = playlistdata.videos.findIndex((id) => id.equals(req.params.videoid));
  if (videoIndex === -1) throw new ApiiError(400, "video does not exist in playlist");
  playlistdata.videos.splice(videoIndex, 1);
  await playlistdata.save();
  res.status(200).json({
    success: true,
    message: "video removed from playlist successfully",
    data: playlistdata,
  });
});

const deleteplaylist = asyncHandler(async (req, res) => {
  const playlistdata = await findOwnedPlaylist(req, req.params.playlistid);
  await playlistdata.deleteOne();
  res.status(200).json({
    success: true,
    message: "playlist deleted successfully",
    data: playlistdata,
  });
});

const updateplaylist = asyncHandler(async (req, res) => {
  const playlistdata = await findOwnedPlaylist(req, req.params.playlistid);
  const { name, description } = req.body;
  if (name === undefined && description === undefined) {
    throw new ApiiError(400, "playlist name or description is required");
  }
  if (name !== undefined) {
    if (!name.trim()) throw new ApiiError(400, "playlist name cannot be empty");
    playlistdata.name = name.trim();
  }
  if (description !== undefined) playlistdata.description = description.trim();

  await playlistdata.save();
  res.status(200).json({
    success: true,
    message: "playlist updated successfully",
    data: playlistdata,
  });
});

export {
  createPlaylist,
  getuserplaylists,
  getplaylistbyid,
  addvideotoplaylist,
  removevideofromplaylist,
  deleteplaylist,
  updateplaylist,
};
