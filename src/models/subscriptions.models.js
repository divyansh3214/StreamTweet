import mongoose, { Schema, SchemaTypes } from "mongoose"
const subsrriptionschema=new Schema({
  subscriber:{
    type:Schema.Types.ObjectId,//who is subscribing
    ref:"User"
  },
  channels:{
    type:Schema.Types.ObjectId,//one to whom user is subscribing
    ref:"User"
  }
},{timestamps:true})
export const subscription=mongoose.model("subscription",subsrriptionschema)