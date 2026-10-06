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
        fs.unlinkSync(localfilepath)
        return response;
    }catch(error){
      fs.unlinkSync(localfilepath);//remove the file from local storage
      return null;
    } 
}

const publicurl=async(url)=>{
    const parts = url.split('/');
    const fileWithExt = parts.pop();
    const fileName = fileWithExt.split('.')[0];
    const folderPath = parts.slice(parts.indexOf('upload') + 1).join('/');
    return folderPath ? `${folderPath}/${fileName}` : fileName;
}

const deleteoncloudinary=async(fileUrl)=>{
  const publicId=await publicurl(fileUrl);
  try {
      const result = await cloudinary.uploader.destroy(publicId, { invalidate: true });
      console.log('Delete result:', result);
      return result;
   } catch (err) {
      console.error('Error deleting file:', err);
      throw err;
   }
}
export {deleteoncloudinary}
export default uploadoncloudinary;
