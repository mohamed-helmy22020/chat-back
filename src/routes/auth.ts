import express from "express";
import {
    login,
    register,
    resetPassword,
    sendResetPasswordCode,
} from "../controllers/auth";
const authRouter = express.Router();

authRouter.route("/login").post(login);
authRouter.route("/register").post(register);
authRouter.route("/send-reset-code").post(sendResetPasswordCode);
authRouter.route("/reset-password").post(resetPassword);

export default authRouter;
