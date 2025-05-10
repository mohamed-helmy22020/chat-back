import { NextFunction } from "express";

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

export interface IUser extends Document {
    name: string;
    email: string;
    password: string;
    phone?: string;
    isEmailVerified: boolean;
    isPhoneVerified: boolean;
    emailVerificationCode: number;
    phoneVerificationCode: number;
    resetPasswordCode: number;
    userProfileImage: string;
    favCourses: mongoose.Schema.Types.ObjectId[];
    enrolledCourses: mongoose.Schema.Types.ObjectId[];
    createAccessToken: () => string;
    encryptPassword: (password: string) => Promise<string>;
    comparePassword: (candidatePassword: string) => Promise<boolean>;
    getData: () => any;
}

const userSchema = new mongoose.Schema<IUser>(
    {
        name: {
            type: String,
            required: [true, "Please provide name"],
            match: [/^[a-zA-Z]+/, "Please provide a valid name"],
        },
        email: {
            type: String,
            required: [true, "Please provide email"],
            match: [
                /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
                "Please provide a valid email",
            ],
            unique: [true, "This email is used"],
        },

        phone: {
            type: String,
            required: [true, "Please provide phone"],
            unique: [true, "This phone is used"],
        },
        password: {
            type: String,
            required: [true, "Please provide password"],
        },
        isEmailVerified: {
            type: Boolean,
            default: false,
        },
        isPhoneVerified: {
            type: Boolean,
            default: false,
        },
        emailVerificationCode: String,
        phoneVerificationCode: String,
        resetPasswordCode: String,
        userProfileImage: {
            type: String,
            default: "",
        },
    },
    {
        timestamps: true,
    }
);

/**
 * @openapi
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         userId:
 *           type: string
 *         email:
 *           type: string
 *         phone:
 *           type: string
 *         name:
 *           type: string
 *         isEmailVerified:
 *           type: boolean
 *         isPhoneVerified:
 *           type: boolean
 *         userProfileImage:
 *           type: string
 */
userSchema.methods.getData = function () {
    return {
        userId: this._id,
        email: this.email,
        phone: this.phone,
        name: this.name,
        isEmailVerified: this.isEmailVerified,
        isPhoneVerified: this.isPhoneVerified,
        userProfileImage: this.userProfileImage,
        stripeCustomerId: this.stripeCustomerId,
    };
};

userSchema.pre("save", async function (next: NextFunction) {
    if (this.isModified("password")) {
        this.password = await this.encryptPassword(this.password);
    }
    if (this.isModified("email")) {
        this.isEmailVerified = false;
    }
    if (this.isModified("phone")) {
        this.isPhoneVerified = false;
    }
    next();
});

userSchema.methods.createAccessToken = function () {
    return jwt.sign(
        {
            userId: this._id,
            email: this.email,
        },
        process.env.ACCESS_TOKEN_SECRET
    );
};
userSchema.methods.encryptPassword = async function (password: string) {
    const salt = await bcrypt.genSalt(10);
    const encryptedPassword = await bcrypt.hash(password, salt);
    return encryptedPassword;
};

userSchema.methods.comparePassword = async function (
    candidatePassword: string
) {
    const isMatch = await bcrypt.compare(candidatePassword, this.password);
    return isMatch;
};

export default mongoose.model("User", userSchema);
