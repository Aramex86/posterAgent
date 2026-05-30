import { v2 as cloudinary } from 'cloudinary';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env') });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function upload() {
  try {
    const result = await cloudinary.uploader.upload('generated-images/ray_so_code_card.png', {
      folder: 'posteragent',
      resource_type: 'image',
    });
    console.log('✅ Uploaded to Cloudinary:', result.secure_url);
  } catch (error) {
    console.error('❌ Upload failed:', error);
  }
}

upload();
