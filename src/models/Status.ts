import mongoose, { Schema } from "mongoose";

/**
 * @openapi
 * components:
 *   schemas:
 *     Status:
 *       type: object
 *       required:
 *         - userId
 *       properties:
 *         _id:
 *           type: string
 *           description: The auto-generated id of the status
 *         userId:
 *           type: string
 *           description: The id of the user
 *         content:
 *           type: string
 *           description: The content of the status
 *         mediaUrl:
 *           type: string
 *           description: The media url of the status
 *         mediaType:
 *           type: string
 *           description: The media type of the status
 *         viewers:
 *           type: array
 *           items:
 *             type: string
 *           description: The viewers of the status
 *         expiresAt:
 *           type: string
 *           description: The expiration date of the status
 *         createdAt:
 *           type: string
 *           description: The creation date of the status
 *         updatedAt:
 *           type: string
 *           description: The last update date of the status
 */
// Status Schema
const StatusSchema = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        content: {
            type: String,
            required: false,
        },
        mediaUrl: {
            type: String,
            required: false,
            default: "",
        },
        mediaType: {
            type: String,
            enum: ["image", "video", ""],
            required: false,
            default: "",
        },
        viewers: [
            {
                type: Schema.Types.ObjectId,
                ref: "User",
            },
        ],
        expiresAt: {
            type: Date,
            default: function () {
                // Status expires after 24 hours
                return new Date(Date.now() + 24 * 60 * 60 * 1000);
            },
        },
        isDeleted: {
            type: Boolean,
            default: false,
        },
        createdAt: {
            type: Date,
            default: Date.now,
        },
        updatedAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
        query: {
            active: function () {
                return this.where({
                    expiresAt: { $gt: new Date() },
                    isDeleted: false,
                });
            },
        },
        methods: {
            getData: function (type = "all") {
                if (type === "friend") {
                    return {
                        _id: this._id,
                        userId: this.userId,
                        content: this.content,
                        expiresAt: this.expiresAt,
                        mediaUrl: this.mediaUrl,
                        mediaType: this.mediaType,
                        createdAt: this.createdAt,
                    };
                }
                return {
                    _id: this._id,
                    userId: this.userId,
                    content: this.content,
                    mediaUrl: this.mediaUrl,
                    mediaType: this.mediaType,
                    viewers: this.viewers,
                    expiresAt: this.expiresAt,
                    createdAt: this.createdAt,
                    updatedAt: this.updatedAt,
                };
            },
        },
    }
);

StatusSchema.index({ expiresAt: 1 });

export const Status = mongoose.model("Status", StatusSchema);
