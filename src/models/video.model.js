import mongoose from 'mongoose';
import mongooseAggregatePaginate from 'mongoose-aggregate-paginate-v2';
const videoschema= new mongoose.Schema({
    videofile:{
        type:String, // URL of the video file cloudinary
        required:true,
    },
    thumbnail:{
        type:String, // URL of the video file cloudinary
        required:true,
    },
    title:{
        type:String,
        required:true,
        trim:true,
    },
    description:{
        type:String,
        required:true,
    },
    duration:{
        type:Number,// duration of the video in seconds from cloudinary
        required:true,
    },
    views:{
        type:Number,
        default:0
    },
    isPublished:{
        type:Boolean,
        default:true
    },
    owner:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User"
    }
},{timestamps:true});
videoschema.plugin(mongooseAggregatePaginate);
const video=mongoose.model("Video", videoschema);
export default video;