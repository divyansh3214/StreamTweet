import mongoose from "moongoose";
const replyschema=new mongoose.Schema({
    content:{
        type:String,
        required:true
    },
    owner:{
        type:mongoose.Types.ObjectId,
        ref:"User"
    },
    comment:{
        type:mongoose.Types.ObjectId,
        ref:"comments"
    },
    liked:[{
        type:mongoose.Types.ObjectId,
        ref:"User"
    }]
},{timestamps:true});
export const reply=mongoose.model("reply",replyschema);