import mongoose,{Schema} from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";
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
commentschema.plugin(mongoosePaginate);
export const comments=mongoose.model("comments",commentschema);