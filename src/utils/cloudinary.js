import { v2 as cloudinary } from 'cloudinary';
import fs from "fs";
cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET // Click 'View API Keys' above to copy your API secret
});


const uploadoncloudinary=async(localfilepath)=>{
    try{
        if(!localfilepath)return null;
       const response= await cloudinary.uploader.upload(localfilepath,{
            resource_type:"auto",
        })
        //file is uploaded to cloudinary, now delete the file from local storage
        console.log("File uploaded to cloudinary successfully",response.url);
        return response;
    }catch(error){
      fs.unlinkSync(localfilepath);//remove the file from local storage
      return null;
    } 
}
export default uploadoncloudinary;
