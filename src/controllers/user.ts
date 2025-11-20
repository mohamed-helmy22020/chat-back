import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import mongoose, { isValidObjectId } from "mongoose";
import { handleUploadPicFromBuffer } from "../config/cloudinary";
import {
    BadRequestError,
    NotFoundError,
    UnauthenticatedError,
} from "../errors";
import { getIO } from "../middleware/socketMiddleware";
import FriendRequest from "../models/FriendRequest";
import User from "../models/User";

export const getUserData = async (req: Request, res: Response) => {
    const user = req.user;
    res.status(StatusCodes.OK).json({ success: true, user: user.getData() });
};

export const updateUserData = async (req: Request, res: Response) => {
    const user = req.user;
    const { name, email, newPassword, phone, currentPassword, bio } = req.body;
    const { file: profilePicture } = req;

    const isPasswordCorrect = currentPassword
        ? await user.comparePassword(currentPassword)
        : false;

    const userData: any = {};

    if (name && name.length <= 25) {
        userData.name = name;
    } else if (name && name.length > 25) {
        throw new BadRequestError("Name should be less than 25 characters");
    }

    if (bio) {
        userData.bio = bio;
    }

    if (email || newPassword || phone) {
        if (!isPasswordCorrect) {
            throw new UnauthenticatedError("current password is incorrect");
        }
        if (email) userData.email = email;
        if (phone) userData.phone = phone;
        if (newPassword)
            userData.password = await user.encryptPassword(newPassword);
    }

    if (profilePicture) {
        try {
            const cldRes = await handleUploadPicFromBuffer(profilePicture, {
                public_id: `profile_picture_${user._id}`,
                folder: "profile_pictures",
            });
            userData.userProfileImage = cldRes.secure_url;
        } catch (error) {
            throw new Error(error);
        }
    }

    const updatedUser = await User.findByIdAndUpdate(user._id, userData, {
        new: true,
        runValidators: true,
    });

    res.status(StatusCodes.OK).json({
        success: true,
        user: updatedUser.getData(),
    });
};

export const blockUser = async (req: Request, res: Response) => {
    const io = getIO();
    const chatNamespace = io.of("/api/chat");
    const user = req.user;
    const { userId } = req.params;

    if (!userId || !isValidObjectId(userId)) {
        throw new BadRequestError("userId is required");
    }

    if (userId === user._id.toString()) {
        throw new BadRequestError("Can't block yourself");
    }

    if (user.blockList.includes(new mongoose.Types.ObjectId(userId))) {
        throw new BadRequestError("User already blocked");
    }

    const isFriend = await FriendRequest.findOne({
        $or: [
            { from: userId, to: user._id },
            { from: user._id, to: userId },
        ],
    });

    if (
        isFriend &&
        (isFriend.status === "accepted" || isFriend.status === "pending")
    ) {
        isFriend.status = "rejected";
        await isFriend.save();
    }
    user.blockList.push(new mongoose.Types.ObjectId(userId));
    await user.save();
    chatNamespace.to(`user:${userId}`).emit("friendDeleted", {
        userId: user._id,
    });
    res.status(StatusCodes.OK).json({ success: true });
};

export const unblockUser = async (req: Request, res: Response) => {
    const user = req.user;
    const { userId } = req.params;

    if (!userId || !isValidObjectId(userId)) {
        throw new BadRequestError("userId is required");
    }

    if (!user.blockList.includes(new mongoose.Types.ObjectId(userId))) {
        throw new BadRequestError("User not blocked");
    }
    user.blockList = user.blockList.filter((id) => id.toString() !== userId);
    await user.save();

    res.status(StatusCodes.OK).json({ success: true });
};

export const addFriend = async (req: Request, res: Response) => {
    const io = getIO();
    const chatNamespace = io.of("/api/chat");
    const user = req.user;
    const { userId } = req.params;
    if (!userId || !isValidObjectId(userId)) {
        throw new BadRequestError("userId is required");
    }
    if (userId === user._id.toString()) {
        throw new BadRequestError("Can't add yourself as a friend");
    }
    const otherUser = await User.findById({ _id: userId });
    if (!otherUser) {
        throw new NotFoundError("User not found");
    }
    if (user.blockList.includes(new mongoose.Types.ObjectId(userId))) {
        throw new BadRequestError("you can't add blocked user");
    }
    if (otherUser.blockList.includes(user._id as mongoose.Types.ObjectId)) {
        throw new BadRequestError("can't add this user to friend");
    }
    let friendRequest = await FriendRequest.findOne({
        $or: [
            { from: userId, to: user._id },
            { from: user._id, to: userId },
        ],
    });

    if (!friendRequest) {
        friendRequest = await FriendRequest.create({
            from: user._id,
            to: new mongoose.Types.ObjectId(userId),
        });
        chatNamespace.to(`user:${userId}`).emit("newFriendRequest", {
            user: user.getData("findUser"),
        });
        res.status(StatusCodes.OK).json({ success: true });
        return;
    }

    if (friendRequest.status === "accepted") {
        throw new BadRequestError("You are already friends");
    }

    if (friendRequest.status === "pending") {
        throw new BadRequestError("Friend request already sent");
    }

    if (friendRequest.status === "rejected") {
        friendRequest.from = user._id;
        friendRequest.to = new mongoose.Types.ObjectId(userId);
        friendRequest.status = "pending";
        await friendRequest.save();
    }
    chatNamespace.to(`user:${userId}`).emit("newFriendRequest", {
        user: user.getData("findUser"),
    });
    res.status(StatusCodes.OK).json({ success: true });
};

export const deleteFriend = async (req: Request, res: Response) => {
    const io = getIO();
    const chatNamespace = io.of("/api/chat");
    const user = req.user;
    const { userId } = req.params;

    let friendRequest = await FriendRequest.findOne({
        $or: [
            { from: userId, to: user._id },
            { from: user._id, to: userId },
        ],
        status: "accepted",
    });
    if (!friendRequest) {
        throw new BadRequestError("No friend with this id");
    }
    friendRequest.status = "rejected";
    await friendRequest.save();
    chatNamespace.to(`user:${userId}`).emit("friendDeleted", {
        userId: user._id,
    });
    res.status(StatusCodes.OK).json({ success: true });
};

export const getFriendsList = async (req: Request, res: Response) => {
    const user = req.user;
    let fetchedFriends = await FriendRequest.find({
        $or: [{ from: user._id }, { to: user._id }],
        status: "accepted",
    })
        .populate("from", "name userProfileImage")
        .populate("to", "name userProfileImage");

    const friends = fetchedFriends.map((friend) => {
        if (friend.from._id.toString() === user._id.toString()) {
            return friend.to;
        }
        return friend.from;
    });

    res.status(StatusCodes.OK).json({ success: true, friends: friends });
};

export const getFriendRequests = async (req: Request, res: Response) => {
    const user = req.user;
    const fetchedFriendRequests = await FriendRequest.find({
        to: user._id,
        status: "pending",
    }).populate("from", "name userProfileImage");

    const friendRequests = fetchedFriendRequests.map((friendRequest) => {
        return friendRequest.from;
    });
    res.status(StatusCodes.OK).json({ success: true, friendRequests });
};

export const acceptFriendRequest = async (req: Request, res: Response) => {
    const io = getIO();
    const chatNamespace = io.of("/api/chat");
    const user = req.user;
    const { userId } = req.params;
    if (!userId || !isValidObjectId(userId)) {
        throw new BadRequestError("userId is required");
    }
    const friendRequest = await FriendRequest.findOne({
        from: new mongoose.Types.ObjectId(userId),
        to: user._id,
        status: "pending",
    });

    if (!friendRequest) {
        throw new NotFoundError("Friend request not found");
    }
    friendRequest.status = "accepted";
    await friendRequest.save();
    chatNamespace.to(`user:${userId}`).emit("friendAccepted", {
        userId: user._id,
    });
    res.status(StatusCodes.OK).json({ success: true });
};

export const cancelFriendRequest = async (req: Request, res: Response) => {
    const io = getIO();
    const chatNamespace = io.of("/api/chat");
    const user = req.user;
    const { userId } = req.params;
    if (!userId || !isValidObjectId(userId)) {
        throw new BadRequestError("userId is required");
    }
    const friendRequest = await FriendRequest.findOne({
        $or: [
            { from: userId, to: user._id },
            { from: user._id, to: userId },
        ],
        status: "pending",
    });

    if (!friendRequest) {
        throw new NotFoundError("Friend request not found");
    }
    friendRequest.status = "rejected";
    await friendRequest.save();
    chatNamespace.to(`user:${userId}`).emit("friendRequestCancelled", {
        userId: user._id,
    });
    res.status(StatusCodes.OK).json({ success: true });
};

export const getSentRequests = async (req: Request, res: Response) => {
    const user = req.user;
    const fetchedFriendRequests = await FriendRequest.find({
        from: user._id,
        status: "pending",
    }).populate("to", "name userProfileImage");

    const sentRequests = fetchedFriendRequests.map((fr) => {
        return fr.to;
    });

    res.status(StatusCodes.OK).json({
        success: true,
        sentRequests,
    });
};

export const getBlockedList = async (req: Request, res: Response) => {
    const user = req.user;
    const fetchedUsers = await User.find({
        _id: { $in: user.blockList },
    });

    const blockedUsers = fetchedUsers.map((user) =>
        user.getData("userRequest")
    );

    res.status(StatusCodes.OK).json({
        success: true,
        blockedUsers,
    });
};

export const findUser = async (req: Request, res: Response) => {
    const user = req.user;
    const { userEmail } = req.params;

    const fetchedUser = await User.findOne({
        email: userEmail,
    });
    if (!fetchedUser) {
        throw new NotFoundError("User not found");
    }
    const isBlocked =
        fetchedUser.blockList.includes(user._id as mongoose.Types.ObjectId) ||
        user.blockList.includes(fetchedUser._id as mongoose.Types.ObjectId);

    if (isBlocked) {
        throw new NotFoundError("User not found");
    }

    const isFriend = await FriendRequest.findOne({
        $or: [
            { from: fetchedUser._id, to: user._id },
            { from: user._id, to: fetchedUser._id },
        ],
    });

    res.status(StatusCodes.OK).json({
        success: true,
        user: {
            ...fetchedUser.getData("findUser"),
            isFriend: !!isFriend && isFriend.status === "accepted",
            isSentRequest:
                !!isFriend &&
                isFriend.from.toString() === user._id.toString() &&
                isFriend.status === "pending",
            isReceivedRequest:
                !!isFriend &&
                isFriend.from.toString() !== user._id.toString() &&
                isFriend.status === "pending",
        },
    });
};
