import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import mongoose from "mongoose";
import {
    handleUploadPicFromBuffer,
    handleUploadVideoFromBuffer,
} from "../config/cloudinary";
import {
    allowedPictureTypes,
    allowedVideoTypes,
} from "../middleware/checkFiles";
import { getIO } from "../middleware/socketMiddleware";
import FriendRequest from "../models/FriendRequest";
import { Status } from "../models/Status";

export const getUserStatuses = async (req: Request, res: Response) => {
    const user = req.user;

    const statuses = await Status.find({ userId: user._id })
        .active()
        .sort({ createdAt: 1 })
        .populate("userId", "_id name userProfileImage")
        .populate("viewers.user", "_id name userProfileImage");
    res.json({
        success: true,
        statuses: statuses.map((status) => status.getData()),
    });
};

export const getFriendsStatuses = async (req: Request, res: Response) => {
    const user = req.user;

    const friends = (
        await FriendRequest.find({
            $or: [{ from: user._id }, { to: user._id }],
            status: "accepted",
        })
    ).map((friend) => {
        if (friend.from.toString() === user._id.toString()) {
            return friend.to;
        }
        return friend.from;
    });

    const statuses = await Status.find({ userId: { $in: friends } })
        .active()
        .sort({ createdAt: 1 })
        .populate("userId", "_id name userProfileImage");
    res.json({
        success: true,
        statuses: statuses.map((status) => ({
            ...status.getData("friend"),
            isSeen:
                status.viewers.findIndex((s) => s.user.equals(user._id)) > -1,
        })),
    });
};

export const createStatus = async (req: Request, res: Response) => {
    const io = getIO();
    const chatNamespace = io.of("/api/chat");
    const user = req.user;
    const content = req.body?.content;
    const { file: statusMedia } = req;
    if (!content && !statusMedia) {
        res.status(StatusCodes.BAD_REQUEST).json({
            message: "Content or media is required",
        });
        return;
    }
    const _id = new mongoose.Types.ObjectId();
    const statusData = {
        _id,
        userId: user._id,
        content,
        mediaUrl: "",
        mediaType: "",
    };

    if (statusMedia) {
        try {
            if (allowedPictureTypes.includes(statusMedia.mimetype)) {
                const cldRes = await handleUploadPicFromBuffer(statusMedia, {
                    public_id: `status_${user._id}_${_id}`,
                    folder: "status",
                });
                statusData.mediaUrl = cldRes.secure_url;
                statusData.mediaType = "image";
            } else if (allowedVideoTypes.includes(statusMedia.mimetype)) {
                const cldRes = await handleUploadVideoFromBuffer(statusMedia, {
                    public_id: `status_${user._id}_${_id}`,
                    folder: "status",
                });
                statusData.mediaUrl = cldRes.secure_url;
                statusData.mediaType = "video";
            }
        } catch (error) {
            console.log(error);
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                message: "Error uploading media",
            });
            return;
        }
    }

    const status = await (
        await Status.create(statusData)
    ).populate("userId", "_id name userProfileImage");

    const friendsChannels = (
        await FriendRequest.find({
            $or: [{ from: user._id }, { to: user._id }],
            status: "accepted",
        }).select("from to")
    ).map((friend) => {
        if (friend.from.toString() === user._id.toString()) {
            return `user:${friend.to.toString()}`;
        }
        return `user:${friend.from.toString()}`;
    });

    chatNamespace.to(friendsChannels).emit("newFriendStatus", {
        status: { ...status.getData("friend"), isSeen: false },
    });

    res.status(StatusCodes.CREATED).json({
        success: true,
        status: status.getData(),
    });
};

export const seeStatus = async (req: Request, res: Response) => {
    const io = getIO();
    const chatNamespace = io.of("/api/chat");
    const user = req.user;
    const { statusId } = req.params;
    const status = await Status.findOne({ _id: statusId }).active();
    if (!status) {
        res.status(StatusCodes.NOT_FOUND).json({ message: "Status not found" });
        return;
    }
    if (status.userId.toString() === user._id.toString()) {
        res.status(StatusCodes.BAD_REQUEST).json({
            message: "You cannot see your own status",
        });
        return;
    }
    if (!status.viewers.find((s) => s.user.equals(user._id))) {
        status.viewers.push({ user: user._id });
        await status.save();
    }
    chatNamespace.to(`user:${status.userId.toString()}`).emit("statusSeen", {
        statusId: status._id,
        user: {
            _id: user._id,
            name: user.name,
            userProfileImage: user.userProfileImage,
        },
    });
    res.status(StatusCodes.OK).json({
        ...status.getData("friend"),
        isSeen: status.viewers.findIndex((s) => s.user.equals(user._id)) > -1,
    });
};

export const deleteStatus = async (req: Request, res: Response) => {
    const io = getIO();
    const chatNamespace = io.of("/api/chat");

    const user = req.user;
    const { statusId } = req.params;

    const status = await Status.where({
        _id: statusId,
        userId: user._id,
    })
        .active()
        .findOne();
    if (!status) {
        res.status(StatusCodes.NOT_FOUND).json({ message: "Status not found" });
        return;
    }
    status.isDeleted = true;
    await status.save();
    const friendsChannels = (
        await FriendRequest.find({
            $or: [{ from: user._id }, { to: user._id }],
            status: "accepted",
        }).select("from to")
    ).map((friend) => {
        if (friend.from.toString() === user._id.toString()) {
            return `user:${friend.to.toString()}`;
        }
        return `user:${friend.from.toString()}`;
    });
    chatNamespace.to(friendsChannels).emit("deleteFriendStatus", {
        statusId,
    });

    res.status(StatusCodes.OK).json({
        success: "true",
    });
};
