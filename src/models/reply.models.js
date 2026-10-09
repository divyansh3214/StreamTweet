import mongoose from "mongoose";
const replyschema=new mongoose.Schema({
    content:{
        type:String,
        required:true
    },
    owner:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User"
    },
    comment:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"comments"
    },
    liked:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User"
    }]
},{timestamps:true});
export const reply=mongoose.model("reply",replyschema);