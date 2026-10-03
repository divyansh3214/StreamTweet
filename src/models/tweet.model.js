import mongoose from 'mongoose';
import mongoosePaginate from "mongoose-paginate-v2";
const tweetschema=new mongoose.Schema({
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
tweetschema.plugin(mongoosePaginate);
export const tweet=mongoose.model("tweet",tweetschema);