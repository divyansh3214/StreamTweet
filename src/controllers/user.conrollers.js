import { asyncHandler } from "../utils/async_handler.js";
import ApiiError from "../utils/Api_error.js";
import user from "../models/user.model.js";
import bcrypt from "bcryptjs";

const registeruser = asyncHandler(async (req, res) => {
    const { fullname, email, username, password } = req.body;

    if ([fullname, email, username, password].some(field => field?.trim() === "")) {
        throw new ApiiError(400, "All fields required");
    }

    const existedUser = await user.findOne({
        $or: [{ username }, { email }]
    });

    if (existedUser) {
        throw new ApiiError(409, "User already exists");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await user.create({
        fullname,
        email,
        username,
        password: hashedPassword
    });

    if (!newUser) {
        throw new ApiiError(500, "User registration failed");
    }

    const userResponse = {
        _id: newUser._id,
        fullname: newUser.fullname,
        email: newUser.email,
        username: newUser.username
    };

    res.status(201).json({
        success: true,
        message: "User registered successfully",
        user: userResponse
    });
});

export { registeruser };
