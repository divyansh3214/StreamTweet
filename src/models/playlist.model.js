import mongoose from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";
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
playlistschema.plugin(mongoosePaginate);
export const playlist=mongoose.model("playlist",playlistschema);