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
import FriendRequest from "../models/FriendRequest";
import { Status } from "../models/Status";

export const getUserStatuses = async (req: Request, res: Response) => {
    const user = req.user;

    const statuses = await Status.find({ userId: user._id })
        .active()
        .sort({ createdAt: 1 })
        .populate("userId", "_id name userProfileImage");
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

    console.log(friends);

    const statuses = await Status.find({ userId: { $in: friends } })
        .active()
        .sort({ createdAt: 1 })
        .populate("userId", "_id name userProfileImage");
    res.json({
        success: true,
        statuses: statuses.map((status) => ({
            ...status.getData("friend"),
            isSeen: status.viewers.includes(user._id),
        })),
    });
};

export const createStatus = async (req: Request, res: Response) => {
    const user = req.user;
    const content = req.body?.content;
    const { file: statusMedia } = req;
    console.log({ content, statusMedia });
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

    const status = new Status(statusData);

    await status.save();

    res.status(StatusCodes.CREATED).json({
        success: true,
        status: status.getData(),
    });
};

export const seeStatus = async (req: Request, res: Response) => {
    const user = req.user;
    const { statusId } = req.params;
    const status = await Status.findOne({ _id: statusId });
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
    if (!status.viewers.includes(user._id)) {
        status.viewers.push(user._id);
        await status.save();
    }
    res.status(StatusCodes.OK).json({
        ...status.getData("friend"),
        isSeen: status.viewers.includes(user._id),
    });
};

export const deleteStatus = async (req: Request, res: Response) => {
    const user = req.user;
    const { statusId } = req.params;

    const status = await Status.where({
        _id: statusId,
        userId: user._id,
    })
        .active()
        .findOne();
    console.log(status);
    if (!status) {
        res.status(StatusCodes.NOT_FOUND).json({ message: "Status not found" });
        return;
    }
    status.isDeleted = true;
    await status.save();

    res.status(StatusCodes.OK).json({
        success: "true",
    });
};
