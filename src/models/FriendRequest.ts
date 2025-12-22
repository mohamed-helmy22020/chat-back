import mongoose from "mongoose";

export interface FriendRequest extends mongoose.Document {
    from: mongoose.Types.ObjectId;
    to: mongoose.Types.ObjectId;
    status: "pending" | "accepted" | "rejected";
}

const friendRequestSchema = new mongoose.Schema(
    {
        from: {
            type: mongoose.Types.ObjectId,
            ref: "User",
            required: [true, "Sender is required"],
            index: true,
        },
        to: {
            type: mongoose.Types.ObjectId,
            ref: "User",
            required: [true, "Receiver is required"],
            index: true,
        },
        status: {
            type: String,
            enum: ["pending", "accepted", "rejected"],
            default: "pending",
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
 *     UserRequest:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         name:
 *           type: string
 *         userProfileImage:
 *           type: string
 */

export default mongoose.model<FriendRequest & Document>(
    "FriendRequest",
    friendRequestSchema
);
