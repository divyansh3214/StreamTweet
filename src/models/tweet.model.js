import mongoose from 'mongoose';
const tweetschema=new mongoose.Schema({
    content:{
        type:String,
        required:true,
        trim:true
    },
    owner:{
        type:mongoose.Types.ObjectId,
        ref:"User"
    },
    video:{
        type:mongoose.Types.ObjectId,
        ref:"Video"
    }
},{
    timestamps:true
});
export const tweet=mongoose.model("tweet",tweetschema);