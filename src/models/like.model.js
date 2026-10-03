import mongoose from 'mongoose';
const likeschema=new mongoose.Schema({
    video:{
        type:mongoose.Types.ObjectId,
        ref:"Video"
    },
    comment:{
        type:mongoose.Types.ObjectId,
        ref:"comments"
    },
    tweet:{
        type:mongoose.Types.ObjectId,
        ref:"tweet"
    },
    likedby:{
        type:mongoose.Types.ObjectId,
        ref:"User"
    }
},{timestamps:true});
export const like=mongoose.model("like",likeschema);