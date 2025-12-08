import { JwtPayload } from "jsonwebtoken";
import mongoose from "mongoose";
interface CustomJwtPayload extends JwtPayload {
    email: string;
    userId: string;
}
type ReactType = {
    react: "Like" | "Dislike" | "Love" | "Laugh" | "Wow" | "Sad" | "Angry";
    user: mongoose.Types.ObjectId;
};

type UserSettingsType = {
    privacy: PrivacySettingsType;
};

type PrivacySettingsType = {
    online: "Everyone" | "Friends" | "None";
    readReceipts: "Enable" | "Disable";
};
