import Cloudinary from "../config/cloudinary.js"


export const Cloudinary_Subir=(file)=>{
    return new Promise((resolve, reject)=>{
        const stream= Cloudinary.uploader.upload_stream(
            {folder:"tandas"},
            (error,result)=>{
                if (error) return reject(error);
            resolve({
               url: result.secure_url,
          public_id: result.public_id 
            })
            })
        stream.end(file.buffer);
    });
}