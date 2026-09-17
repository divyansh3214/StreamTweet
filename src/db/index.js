import mongoose from "mongoose";
import { DB_NAME } from "./constants.js";

 const connectDB = async () => {
    try {
       const connectionin = await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`);
        console.log(`Connected to MongoDB: ${connectionin.connection.host}`);
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
        process.exit(1); // Exit the process with an error code
    }
};
export default connectDB;