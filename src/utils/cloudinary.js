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
      if(localfilepath && fs.existsSync(localfilepath)){
        fs.unlinkSync(localfilepath);
      }
      throw error;
    } 
}

const publicurl=async(url)=>{
    const parts = new URL(url).pathname.split('/').filter(Boolean);
    const uploadIndex = parts.indexOf('upload');
    if (uploadIndex === -1) {
      throw new Error('Invalid Cloudinary asset URL');
    }
    const assetParts = parts.slice(uploadIndex + 1);
    const hasVersion = /^v\d+$/.test(assetParts[0] || '');
    const publicIdParts = hasVersion ? assetParts.slice(1) : assetParts;
    const fileName = publicIdParts.pop();
    if (!fileName) {
      throw new Error('Cloudinary asset URL does not contain a public ID');
    }
    const extensionIndex = fileName.lastIndexOf('.');
    publicIdParts.push(extensionIndex > -1 ? fileName.slice(0, extensionIndex) : fileName);
    return publicIdParts.join('/');
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
