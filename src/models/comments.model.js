import mongoose,{Schema} from "mongoose";
const commentschema=new Schema({
    content:{
        type:String,
        required:true
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
export const comments=mongoose.model("comments",commentschema);