import mongoose from "mongoose";
import { MessageType } from "./Message";

export interface ConversationType extends mongoose.Document {
    participants: mongoose.Types.ObjectId[];
    lastMessage: mongoose.Types.ObjectId | MessageType;
    userSettings: Map<string, { messages_cleared_at: Date | null }>;
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
        createdAt: this.createdAt,
        updatedAt: this.updatedAt,
    };
};
export default mongoose.model<ConversationType & Document>(
    "Conversation",
    conversationSchema
);
