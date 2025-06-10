import mongoose from "mongoose";
import { MessageType } from "./Message";

export interface ConversationType extends mongoose.Document {
    participants: mongoose.Types.ObjectId[];
    lastMessage: mongoose.Types.ObjectId | MessageType;
    getData: () => any;
}

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
