import mongoose from "mongoose";

export const connectDB = async () => {
    try {
        const { connection } = await mongoose.connect(process.env.DB_URL);
        console.log(`Database is connect with ${connection.host}`);
    } catch (error) {
        console.log(`Error while doing DB connection: ${error.message}`);
        process.exit(1);
    }
  
};