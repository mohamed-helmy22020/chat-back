import mongoose from "mongoose";
import { ReactType } from "types";

export interface MessageType extends mongoose.Document {
    conversationId: mongoose.Types.ObjectId;
    from: mongoose.Types.ObjectId;
    to: mongoose.Types.ObjectId;
    text: string;
    seen: boolean;
    reacts: ReactType[];
    getData: () => any;
    createdAt: Date;
    updatedAt: Date;
}

const messageSchema = new mongoose.Schema(
    {
        conversationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Conversation",
            required: [true, "Please provide conversation id"],
        },
        from: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "Please provide sender user"],
        },
        to: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "Please provide receiver user"],
        },
        text: {
            type: String,
            required: [true, "Please provide message"],
        },
        seen: {
            type: Boolean,
            default: false,
        },
        reacts: {
            type: [
                {
                    react: {
                        type: String,
                        enum: [
                            "Like",
                            "Dislike",
                            "Love",
                            "Laugh",
                            "Wow",
                            "Sad",
                            "Angry",
                        ],
                    },
                    user: {
                        type: mongoose.Schema.Types.ObjectId,
                        ref: "User",
                        required: [true, "Please provide the user"],
                    },
                },
            ],
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
 *     lastMessage:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         from:
 *           type: string
 *         to:
 *           type: string
 *         text:
 *           type: string
 *         seen:
 *           type: boolean
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     Message:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         conversationId:
 *           type: string
 *         from:
 *           type: string
 *         to:
 *           type: string
 *         text:
 *           type: string
 *         seen:
 *           type: boolean
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

messageSchema.methods.getData = function () {
    return {
        id: this._id,
        conversationId: this.conversationId,
        from: this.from,
        to: this.to,
        text: this.text,
        seen: this.seen,
        reacts: this.reacts,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt,
    };
};
export default mongoose.model<MessageType & Document>("Message", messageSchema);
