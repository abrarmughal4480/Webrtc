import mongoose from "mongoose";

export const connectDB = async () => {
    try {
        const { connection } = await mongoose.connect(process.env.DB_URL);
        // Database connected successfully
    } catch (error) {
        console.error(`Database connection error: ${error.message}`);
        process.exit(1);
    }
  
};