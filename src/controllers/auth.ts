import { Request, Response } from "express";

import User from "../models/User";

import { StatusCodes } from "http-status-codes";

import { getEmailHtml, sendEmail } from "../config/emailConfig";
import {
    BadRequestError,
    NotFoundError,
    UnauthenticatedError,
} from "../errors";
import { randomBetween } from "../utils";

export const login = async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
        throw new BadRequestError("Please provide email and password");
    }
    const user = await User.findOne({ email });
    if (!user) {
        throw new UnauthenticatedError("Invalid Credentials");
    }
    const isPasswordCorrect = await user.comparePassword(password);
    if (!isPasswordCorrect) {
        throw new UnauthenticatedError("Invalid Credentials");
    }
    res.status(StatusCodes.OK).json({
        success: true,
        user: user.getData(),
        accessToken: user.createAccessToken(),
    });
};

export const register = async (req: Request, res: Response) => {
    const userData = {
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
        phone: req.body.phone,
    };
    const user = await User.create(userData);

    res.status(StatusCodes.CREATED).json({
        success: true,
        user: user.getData(),
        accessToken: user.createAccessToken(),
    });
};

export const sendResetPasswordCode = async (req: Request, res: Response) => {
    const { email } = req.body;
    if (!email) {
        throw new BadRequestError("Please provide email");
    }
    const user = await User.findOne({ email });
    if (!user) {
        throw new NotFoundError(`No user with this email`);
    }
    const resetPasswordCode =
        user.resetPasswordCode || randomBetween(100000, 999999);
    try {
        const htmlTemplate = getEmailHtml(resetPasswordCode);
        await sendEmail(
            user.email,
            `E-Learning App reset password code: ${resetPasswordCode}`,
            `reset password code: ${resetPasswordCode}`,
            htmlTemplate
        );

        if (!user.resetPasswordCode) {
            user.resetPasswordCode = resetPasswordCode;
            user.save();
        }
    } catch (error) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            msg: "Failed to send reset password code",
        });
        return;
    }

    res.status(StatusCodes.OK).json({
        success: true,
        msg: "Reset password code sent to your email",
    });
};

export const resetPassword = async (req: Request, res: Response) => {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) {
        throw new BadRequestError(
            "Please provide email, code and new password"
        );
    }
    const user = await User.findOne({ email });
    if (!user) {
        throw new NotFoundError(`No user with this email`);
    }
    if (user.resetPasswordCode != parseInt(code)) {
        throw new BadRequestError("Invalid code");
    }
    if (newPassword.length < 10) {
        throw new BadRequestError("Password must be at least 10 characters");
    }
    user.password = newPassword;
    user.resetPasswordCode = null;
    await user.save();
    res.status(StatusCodes.OK).json({
        success: true,
        msg: "Password reset successfully",
    });
};
