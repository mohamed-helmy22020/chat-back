import mongoose from "mongoose";
import { MessageType } from "./Message";

export interface ConversationType extends mongoose.Document {
    participants: mongoose.Types.ObjectId[];
    lastMessage: mongoose.Types.ObjectId | MessageType;
    userSettings: Map<string, { messages_cleared_at: Date | null }>;
    type: "group" | "private";
    desc: string;
    groupImage: string;
    admin: mongoose.Types.ObjectId;
    groupName: string;
    getData: () => any;
}

const UserSettingsSchema = new mongoose.Schema(
    {
        messages_cleared_at: {
            type: Date,
            default: null,
        },
    },
    { _id: false }
);
const conversationSchema = new mongoose.Schema(
    {
        participants: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
                index: true,
            },
        ],
        lastMessage: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Message",
            default: null,
        },
        userSettings: {
            type: Map,
            of: UserSettingsSchema,
            default: {},
        },
        type: {
            type: String,
            enum: ["private", "group"],
            default: "private",
        },
        desc: {
            type: String,
            default: "",
        },
        groupImage: {
            type: String,
            default: "",
        },
        admin: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        groupName: {
            type: String,
            default: null,
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
 *     Conversation:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         participants:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/UserRequest'
 *         lastMessage:
 *           $ref: '#/components/schemas/lastMessage'
 *         createdAt:
 *           type: string
 *         updatedAt:
 *           type: string
 */

conversationSchema.methods.getData = function () {
    return {
        id: this._id,
        participants: this.participants,
        lastMessage: this.lastMessage,
        type: this.type,
        desc: this.desc,
        groupImage: this.groupImage,
        admin: this.admin,
        groupName: this.groupName,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt,
    };
};
export default mongoose.model<ConversationType & Document>(
    "Conversation",
    conversationSchema
);
