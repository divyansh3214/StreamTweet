import mongoose from "mongoose";
const playlistschema=new mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    owner:{
        type:mongoose.Types.ObjectId,
        ref:"User"
    },
    description:{
        type:String,
        default:""
    },
    videos:[{
        type:mongoose.Types.ObjectId,
        ref:"Video"
    }]
},{
    timestamps:true
});
export const playlist=mongoose.model("playlist",playlistschema);