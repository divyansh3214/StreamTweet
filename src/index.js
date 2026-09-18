//require("dotenv").config({path:"./env"});
import "dotenv/config";
import connectDB from "./db/index.js";
import app from "./app.js";
/*
import express from "express";
const app = express();
;(async()=>{
    try{
        await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`)
        app.on("error",(error)=>{
            console.log("",error);
            throw error;
        })
        app.listen(process.env.PORT,()=>{
            console.log(`Server is running on port ${process.env.PORT}`);
        })
    }catch(error){
        console.error("Error connecting to MongoDB:", error);
        throw error;
    }
})()
*/

connectDB()
.then(()=>{
  app.on("error",error=>{
    console.error("Error starting server:", error);
    throw error;
  })
  app.listen(process.env.PORT || 3000,()=>{
     console.log(`Server is running on port ${process.env.PORT || 3000}`);
  })
}).catch((err)=>{
    console.error("Error starting server:", err);
}).finally(()=>{
    console.log("Server startup process completed.");
});