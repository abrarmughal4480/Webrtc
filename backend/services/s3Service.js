import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-south-1',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  },
  useAccelerateEndpoint: process.env.S3_USE_ACCELERATE === 'true',
  maxAttempts: parseInt(process.env.S3_MAX_RETRIES) || 3,
  requestHandler: {
    connectionTimeout: parseInt(process.env.S3_CONNECTION_TIMEOUT) || 3000,
    socketTimeout: parseInt(process.env.S3_SOCKET_TIMEOUT) || 120000,
  },
});

const bucketName = process.env.S3_BUCKET_NAME;

export const uploadToS3 = async (file, folder = 'uploads') => {
  try {
    let buffer, contentType, key;
    
    if (file.buffer) {
      // Handle file buffer (from multer/express-fileupload)
      buffer = file.buffer;
      contentType = file.mimetype || 'image/jpeg';
      key = `${folder}/${uuidv4()}_${file.originalname}`;
    } else if (file.data) {
      // Handle base64 data from file upload
      if (Buffer.isBuffer(file.data)) {
        // If data is already a Buffer, use it directly
        buffer = file.data;
      } else if (typeof file.data === 'string') {
        // If data is a string (base64), convert to Buffer
        const base64Data = file.data.replace(/^data:image\/[a-z]+;base64,/, '');
        buffer = Buffer.from(base64Data, 'base64');
      } else {
        // If data is neither Buffer nor string, try to convert
        buffer = Buffer.from(file.data);
      }
      contentType = file.mimetype || 'image/jpeg';
      key = `${folder}/${uuidv4()}_${file.originalname || 'image'}`;
    } else if (typeof file === 'string') {
      // Handle base64 data URL
      const base64Data = file.replace(/^data:image\/[a-z]+;base64,/, '');
      buffer = Buffer.from(base64Data, 'base64');
      contentType = 'image/jpeg';
      key = `${folder}/${uuidv4()}.jpg`;
    } else if (file && typeof file === 'object') {
      // Handle file object with data property (from express-fileupload)
      if (file.data) {
        const base64Data = file.data.toString('base64');
        buffer = file.data;
        contentType = file.mimetype || 'image/jpeg';
        key = `${folder}/${uuidv4()}_${file.originalname || 'image'}`;
      } else {
        throw new Error('File object does not contain valid data');
      }
    } else {
      throw new Error('Invalid file format');
    }
    
    const uploadParams = {
      Bucket: bucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    };

    const command = new PutObjectCommand(uploadParams);
    await s3Client.send(command);
    
    return {
      Key: key,
      Location: `https://${bucketName}.s3.amazonaws.com/${key}`,
      Bucket: bucketName
    };
  } catch (error) {
    throw new Error(`S3 upload failed: ${error.message}`);
  }
};

export const deleteFromS3 = async (key) => {
  try {
    const deleteParams = {
      Bucket: bucketName,
      Key: key,
    };

    const command = new DeleteObjectCommand(deleteParams);
    await s3Client.send(command);
  } catch (error) {
    throw new Error(`S3 deletion failed: ${error.message}`);
  }
};

export const getPresignedUrl = async (key, expiresIn = 3600) => {
  try {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    return await getSignedUrl(s3Client, command, { expiresIn });
  } catch (error) {
    throw new Error(`Presigned URL generation failed: ${error.message}`);
  }
};
