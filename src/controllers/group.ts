import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import mongoose from "mongoose";
import { customAlphabet } from "nanoid";
import { DefaultEventsMap, Socket } from "socket.io";
import {
    handleUploadPicFromBuffer,
    handleUploadVideoFromBuffer,
} from "../config/cloudinary";
import { BadRequestError, UnauthenticatedError } from "../errors";
import {
    allowedPictureTypes,
    allowedVideoTypes,
} from "../middleware/checkFiles";
import { getIO } from "../middleware/socketMiddleware";
import Conversation from "../models/Conversation";
import Message from "../models/Message";
import User from "../models/User";
import { flattenObject } from "../utils";

const ALLOWED_GROUP_SETTING_PATHS = new Set([
    "linkToken",
    "members.editGroupData",
    "members.sendNewMessages",
    "members.addOtherMembers",
    "members.inviteViaLink",
    "admin.approveNewMembers",
]);

export const getGroupData = async (req: Request, res: Response) => {
    const { groupId, token } = req.params;

    const group = await Conversation.findOne({
        _id: groupId,
        type: "group",
    }).populate("admin", "name userProfileImage email bio");

    if (!group) {
        throw new BadRequestError("No group with this id");
    }

    if (group.groupSettings.linkToken !== token) {
        throw new BadRequestError("Invalid link or expired");
    }

    res.status(StatusCodes.OK).json({
        success: true,
        group: group.getData("join"),
    });
};
export const createGroup = async (req: Request, res: Response) => {
    const user = req.user;
    const { name, desc } = req.body;
    const group = await (
        await Conversation.create({
            participants: [user._id],
            type: "group",
            desc,
            admin: user._id,
            groupName: name,
        })
    ).populate("participants", "name userProfileImage email bio");
    res.status(StatusCodes.CREATED).json({
        success: true,
        group: group.getData(),
    });
};

export const joinGroup = async (req: Request, res: Response) => {
    const chatSocket = getIO().of("/api/chat");
    const user = req.user;
    const { groupId } = req.params;
    const { groupLinkToken } = req.body;

    const group = await Conversation.findOne({ _id: groupId, type: "group" })
        .populate([
            {
                path: "lastMessage",
                select: "from to text seen mediaType mediaUrl createdAt updatedAt",
                populate: {
                    path: "from",
                    select: "name userProfileImage email bio",
                },
            },
        ])
        .populate("participants", "name userProfileImage email bio");
    if (!group) {
        throw new BadRequestError("No group with this id");
    }
    if (groupLinkToken !== group.groupSettings.linkToken) {
        throw new BadRequestError("Invalid link or expired");
    }
    if (group.participants.includes(user._id)) {
        throw new BadRequestError("You are already a member");
    }

    await group.updateOne({
        $push: { participants: user._id },
    });

    chatSocket.in(`user:${user._id}`).socketsJoin(`conversation:${group._id}`);
    chatSocket.to(`conversation:${group._id}`).emit("addedToGroup", {
        newUser: user.getData("userRequest"),
        group: group.getData(),
    });
    res.status(StatusCodes.OK).json({
        success: true,
        msg: "You are now a member",
    });
};

export const updateGroupSettings = async (req: Request, res: Response) => {
    const chatSocket = getIO().of("/api/chat");
    const user = req.user;
    const { groupId } = req.params;
    const { groupSettings } = req.body;

    const group = await Conversation.findOne({ _id: groupId, type: "group" });
    if (!group) {
        throw new BadRequestError("No group with this id");
    }
    if (group.admin.toString() !== user._id.toString()) {
        throw new UnauthenticatedError("Can't update this group");
    }

    const flattenedGroupSettings = flattenObject(groupSettings);

    // 2. Build a safe $set update object
    const update: Record<string, any> = {};
    for (const [path, value] of Object.entries(flattenedGroupSettings)) {
        if (ALLOWED_GROUP_SETTING_PATHS.has(path)) {
            update[`groupSettings.${path}`] = value;
        }
    }

    if (Object.keys(update).length === 0) {
        res.status(StatusCodes.BAD_REQUEST).json({
            error: "No valid fields to update",
        });
        return;
    }

    // 3. Apply update

    const updatedGroup = await Conversation.findOneAndUpdate(
        { _id: groupId },
        { $set: update },
        { new: true, runValidators: true }
    );

    console.log("emitting data");
    chatSocket
        .to(`conversation:${updatedGroup._id}`)
        .emit("groupSettingsUpdated", {
            groupId: updatedGroup._id,
            groupSettings: {
                ...updatedGroup.groupSettings,
                linkToken: updatedGroup.groupSettings.members.inviteViaLink
                    ? updatedGroup.groupSettings.linkToken
                    : undefined,
            },
        });
    res.status(StatusCodes.OK).json({
        success: true,
        groupSettings: updatedGroup.groupSettings,
    });
};

export const getGroupLinkToken = async (req: Request, res: Response) => {
    const user = req.user;
    const { groupId } = req.params;
    const group = await Conversation.findOne({ _id: groupId, type: "group" });
    if (!group) {
        throw new BadRequestError("No group with this id");
    }
    if (
        !group.groupSettings.members.inviteViaLink &&
        group.admin.toString() !== user._id.toString()
    ) {
        throw new UnauthenticatedError("Can't get group link token");
    }
    if (group.groupSettings.linkToken) {
        res.status(StatusCodes.OK).json({
            success: true,
            linkToken: group.groupSettings.linkToken,
        });
    } else {
        const linkToken = customAlphabet("1234567890abcdef", 15)();
        await group.updateOne({
            $set: {
                "groupSettings.linkToken": linkToken,
            },
        });
        res.status(StatusCodes.OK).json({
            success: true,
            linkToken,
        });
    }
};

export const resetGroupLinkToken = async (req: Request, res: Response) => {
    const user = req.user;
    const { groupId } = req.params;
    const group = await Conversation.findOne({ _id: groupId, type: "group" });
    if (!group) {
        throw new BadRequestError("No group with this id");
    }
    if (group.admin.toString() !== user._id.toString()) {
        throw new UnauthenticatedError("Can't reset group link token");
    }

    const linkToken = customAlphabet("1234567890abcdef", 15)();
    await group.updateOne({
        $set: {
            "groupSettings.linkToken": linkToken,
        },
    });
    res.status(StatusCodes.OK).json({
        success: true,
        linkToken,
    });
};

export const deleteGroup = async (req: Request, res: Response) => {
    const user = req.user;
    const { groupId } = req.params;
    const group = await Conversation.findById(groupId);
    if (!group) {
        throw new BadRequestError("No group with this id");
    }
    if (group.admin.toString() !== user._id.toString()) {
        throw new UnauthenticatedError("Can't delete this group");
    }
    await group.deleteOne();
    res.status(StatusCodes.OK).json({
        success: true,
        msg: "Group deleted successfully",
    });
};

export const leaveGroup = async (req: Request, res: Response) => {
    const chatSocket = getIO().of("/api/chat");
    const user = req.user;
    const { groupId } = req.params;
    const group = await Conversation.findOneAndUpdate(
        { _id: groupId, type: "group" },
        {
            $pull: { participants: user._id },
        }
    );
    if (!group) {
        throw new BadRequestError("No group with this id");
    }

    chatSocket.in(`user:${user._id}`).socketsLeave(`conversation:${groupId}`);

    res.status(StatusCodes.OK).json({
        success: true,
        msg: "You are no longer a member",
    });
};

export const addUserToGroup = async (req: Request, res: Response) => {
    const chatSocket = getIO().of("/api/chat");
    const user = req.user;
    const { groupId } = req.params;
    const { userIdOrEmail } = req.body;
    const [group, invitedUser] = await Promise.all([
        Conversation.findOne({ _id: groupId, type: "group" })
            .populate([
                {
                    path: "lastMessage",
                    select: "from to text seen mediaType mediaUrl createdAt updatedAt",
                    populate: {
                        path: "from",
                        select: "name userProfileImage email bio",
                    },
                },
            ])
            .populate("participants", "name userProfileImage email bio"),
        User.findOne({
            $or: [{ _id: userIdOrEmail }, { email: userIdOrEmail }],
        }),
    ]);
    if (!group) {
        throw new BadRequestError("No group with this id");
    }
    if (!invitedUser) {
        throw new BadRequestError("No user with this email");
    } else if (group.participants.includes(invitedUser._id)) {
        throw new BadRequestError("User already in group");
    }

    if (
        !group.groupSettings.members.addOtherMembers &&
        group.admin.toString() !== user._id.toString()
    ) {
        throw new UnauthenticatedError("only admin can add user");
    }

    await group.updateOne({
        $push: { participants: invitedUser._id },
    });
    chatSocket
        .in(`user:${invitedUser._id}`)
        .socketsJoin(`conversation:${group._id}`);
    chatSocket.to(`conversation:${group._id}`).emit("addedToGroup", {
        newUser: invitedUser.getData("userRequest"),
        group: group.getData(),
    });

    res.status(StatusCodes.OK).json({
        success: true,
    });
};

export const removeUserFromGroup = async (req: Request, res: Response) => {
    const chatSocket = getIO().of("/api/chat");
    const user = req.user;
    const { groupId } = req.params;
    const { userIdOrEmail } = req.body;
    const [group, deletedUser] = await Promise.all([
        Conversation.findOne({
            _id: groupId,
            type: "group",
        }),
        User.findOne({
            $or: [{ _id: userIdOrEmail }, { email: userIdOrEmail }],
        }),
    ]);
    if (!group) {
        throw new BadRequestError("No group with this id");
    }
    if (!deletedUser) {
        throw new BadRequestError("No user with this id");
    }
    if (group.admin.toString() !== user._id.toString()) {
        throw new UnauthenticatedError("only admin can remove users");
    }

    await group.updateOne({
        $pull: { participants: deletedUser._id },
    });

    chatSocket
        .in(`user:${deletedUser._id}`)
        .socketsLeave(`conversation:${group._id}`);
    chatSocket
        .to(`conversation:${group._id}`)
        .to(`user:${deletedUser._id}`)
        .emit("deletedFromGroup", {
            groupId: group._id,
            userId: deletedUser._id,
        });
    res.status(StatusCodes.OK).json({
        success: true,
    });
};

export const sendGroupMessage = async (
    socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>,
    {
        conversationId,
        text,
        media,
        replyMessage,
    }: {
        conversationId: mongoose.Types.ObjectId;
        text: string;
        media?: {
            buffer: Buffer;
            mimetype: string;
        };
        replyMessage?: mongoose.Types.ObjectId;
    },
    ack?: (response: any) => void
) => {
    const io = getIO();
    const chatNamespace = io.of("/api/chat");
    const user = await User.findById(
        (socket.request as Request).user._id.toString()
    );
    const group = await Conversation.findOne({
        _id: conversationId,
        type: "group",
    }).populate([
        {
            path: "lastMessage",
            select: "from to text seen mediaType mediaUrl createdAt updatedAt",
            populate: {
                path: "from",
                select: "name userProfileImage email bio",
            },
        },
    ]);
    if (!group) {
        throw new BadRequestError("No conversation with this id");
    }

    if (!group.participants.includes(user._id)) {
        throw new BadRequestError("Can't send message to this group");
    }

    if (
        !group.groupSettings.members.sendNewMessages &&
        group.admin.toString() !== user._id.toString()
    ) {
        throw new BadRequestError("Can't send message to this group");
    }
    const _id = new mongoose.Types.ObjectId();
    const messageData = {
        _id,
        conversationId: group._id,
        from: user._id,
        text,
        mediaUrl: "",
        mediaType: "",
        replyMessage: replyMessage
            ? new mongoose.Types.ObjectId(replyMessage)
            : undefined,
    };

    if (media) {
        try {
            if (allowedPictureTypes.includes(media.mimetype)) {
                const cldRes = await handleUploadPicFromBuffer(media, {
                    public_id: `message_${user._id}_${_id}`,
                    folder: "message",
                });
                messageData.mediaUrl = cldRes.secure_url;
                messageData.mediaType = "image";
            } else if (allowedVideoTypes.includes(media.mimetype)) {
                const cldRes = await handleUploadVideoFromBuffer(media, {
                    public_id: `message_${user._id}_${_id}`,
                    folder: "message",
                });
                if ("http_code" in cldRes) {
                    throw new Error("Error uploading media");
                }
                messageData.mediaUrl = cldRes.secure_url;
                messageData.mediaType = "video";
            }
        } catch (error) {
            console.log({ error });
            throw new Error("Error uploading media");
        }
    }

    const createdMessage = await Message.create(messageData);
    const message = await Message.findById(createdMessage._id).populate([
        {
            path: "replyMessage",
            select: "from to text seen mediaType mediaUrl createdAt updatedAt",
            populate: {
                path: "from",
                select: "name userProfileImage email bio",
            },
        },
        { path: "from", select: "name userProfileImage email bio" },
    ]);
    group.lastMessage = new mongoose.Types.ObjectId(message._id.toString());
    await (
        await group.save()
    ).populate("participants", "name userProfileImage email bio");

    const response = {
        success: true,
        message: message.getData(),
        conversation: {
            ...group.getData(),
            lastMessage: message.getData(),
        },
    };

    if (ack) {
        ack(response);
    }

    chatNamespace
        .to(`conversation:${group._id.toString()}`)
        .emit("receiveMessage", response);
};

export const forwardMessageToGroup = async (req: Request, res: Response) => {
    const chatSocket = getIO().of("/api/chat");
    const user = req.user;
    const { messageId } = req.params;
    const { conversationId } = req.body;

    if (!messageId || !conversationId) {
        throw new BadRequestError(
            "Please provide messageId and the conversationId"
        );
    }
    const conversation = await Conversation.findById(conversationId).populate([
        {
            path: "lastMessage",
            select: "from to text seen mediaType mediaUrl createdAt updatedAt",
            populate: {
                path: "from",
                select: "name userProfileImage email bio",
            },
        },
        { path: "participants", select: "name userProfileImage email bio" },
    ]);
    if (!conversation) {
        throw new BadRequestError("No conversation with this id");
    }

    const message = await Message.findById(messageId);
    if (!message) {
        throw new BadRequestError("No message with this id");
    }

    if (!conversation.participants.includes(user._id)) {
        throw new UnauthenticatedError("You can't forward this message");
    }

    const newMessage = await Message.create({
        conversationId: conversation._id,
        from: user._id as mongoose.Types.ObjectId,
        text: message.text,
        mediaUrl: message.mediaUrl,
        mediaType: message.mediaType,
        seen: false,
    });
    conversation.lastMessage = newMessage._id as mongoose.Types.ObjectId;
    await conversation.save();

    const response = {
        success: true,
        message: newMessage.getData(),
        conversation: {
            ...conversation.getData(),
            lastMessage: newMessage.getData(),
        },
    };
    chatSocket
        .to(`conversation:${conversation._id}`)
        .emit("receiveMessage", response);
    res.status(StatusCodes.OK).json(response);
};
