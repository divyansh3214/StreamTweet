import mongoose from "mongoose";
import asyncHandler from "express-async-handler";
import ApiiError from "../utils/ApiiError.js";
import playlist from "../models/playlists.model.js";
import user from "../models/user.model.js";
const createPlaylist=asyncHandler(async(req,res)=>{
    const {name,description}=req.body;
    if(!name || !description){
        throw new ApiiError("name and description are required",400);
    }
    const userId=req.loggedoutuser?._id;
    if(!userId){
        throw new ApiiError("user not found",404);
    }
    const playlistExist=await playlist.findOne({name:name,owner:userId});
    if(playlistExist){
        throw new ApiiError("playlist already exist",400);
    }
    const newPlaylist=await playlist.create({
        name:name,
        owner:userId,
        description:description
    });
    res.status(201).json({
        success:true,
        message:"playlist created successfully",
        data:newPlaylist
    })
})
const getuserplaylists=asyncHandler(async(req,res)=>{
    const {userid}=req.params;
    if(!userid){
        throw new ApiiError("user id is required",400);
    }
    const ifuserpresent=await user.findById(userid);
    if(!ifuserpresent){
        throw new ApiiError(402,"user does not exist")
    }
    const playlists=playlist.aggregate([
        {
            $match:{
                owner:new mongoose.Types.ObjectId(userid)
            }
        }
    ])
    if(!playlists){
        throw new ApiiError("no playlists found",404);
    }
    res.status(200).json({
        success:true,
        message:"playlists fetched successfully",
        data:playlists
    })
})
const getplaylistbyid=asyncHandler(async(req,res)=>{
    const {playlistid}=req.params;
    if(!playlistid){
        throw new ApiiError("playlist id is required",400);
    }
    const playlistdata=await playlist.findById(playlistid).populate("videos");
    if(!playlistdata){
        throw new ApiiError("playlist not found",404);
    }
    res.status(200).json({
        success:true,
        message:"playlist fetched successfully",
        data:playlistdata
    })
})
const addvideotoplaylist=asyncHandler(async(req,res)=>{
    const {playlistid,videoid}=req.params;
    if(!playlistid || !videoid){
        throw new ApiiError("playlist id and video id are required",400);
    }
    const playlistdata=await playlist.findById(playlistid);
    if(!playlistdata){
        throw new ApiiError("playlist not found",404);
    }
    if(playlistdata.videos.includes(videoid)){
        throw new ApiiError("video already exists in playlist",400);
    }
    playlistdata.videos.push(videoid);
    await playlistdata.save();
    res.status(200).json({
        success:true,
        message:"video added to playlist successfully",
        data:playlistdata   
    })
})
const removevideofromplaylist=asyncHandler(async(req,res)=>{
    const {playlistid,videoid}=req.params;
    if(!playlistid || !videoid){
        throw new ApiiError("playlist id and video id are required",400);
    }
    const playlistdata=await playlist.findById(playlistid);
    if(!playlistdata){
        throw new ApiiError("playlist not found",404);
    }
    if(!playlistdata.videos.includes(videoid)){
        throw new ApiiError("video does not exist in playlist",400);
    }
    playlistdata.videos.pull(videoid);
    await playlistdata.save();
    res.status(200).json({
        success:true,
        message:"video removed from playlist successfully",
        data:playlistdata   
    })
})
const deleteplaylist=asyncHandler(async(req,res)=>{
    const {playlistid}=req.params;
    if(!playlistid){
        throw new ApiiError("playlist id is required",400);
    }
    const playlistdata=await playlist.findById(playlistid);
    if(!playlistdata){
        throw new ApiiError("playlist not found",404);
    }
    await playlistdata.remove();
    res.status(200).json({
        success:true,
        message:"playlist deleted successfully",
        data:playlistdata   
    })
})
const updateplaylist=asyncHandler(async(req,res)=>{
    const {playlistid}=req.params;
    const {name,description}=req.body;
    if(!playlistid){
        throw new ApiiError("playlist id is required",400);
    }
    const playlistdata=await playlist.findById(playlistid);
    if(!playlistdata){
        throw new ApiiError("playlist not found",404);
    }
    if(name){
        playlistdata.name=name;
    }
    if(description){
        playlistdata.description=description;
    }
    await playlistdata.save();
    res.status(200).json({
        success:true,
        message:"playlist updated successfully",
        data:playlistdata   
    })
})
export {createPlaylist,getuserplaylists,getplaylistbyid,addvideotoplaylist,removevideofromplaylist,deleteplaylist,updateplaylist}

