import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import mongoose from "mongoose";
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
    ).populate("participants", "name userProfileImage");
    res.status(StatusCodes.CREATED).json({
        success: true,
        group: group.getData(),
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
    await Conversation.findByIdAndUpdate(groupId, {
        $pull: { participants: user._id },
    });

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
        Conversation.findById(groupId)
            .populate([
                {
                    path: "lastMessage",
                    select: "from to text seen mediaType mediaUrl createdAt updatedAt",
                    populate: {
                        path: "from",
                        select: "name userProfileImage",
                    },
                },
            ])
            .populate("participants", "name userProfileImage"),
        User.findOne({
            $or: [{ _id: userIdOrEmail }, { email: userIdOrEmail }],
        }),
    ]);
    if (!group) {
        throw new BadRequestError("No group with this id");
    }
    if (!invitedUser) {
        throw new BadRequestError("No user with this email");
    }
    if (group.admin.toString() !== user._id.toString()) {
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
        Conversation.findById(groupId),
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
        .to(`conversation:${deletedUser._id}`)
        .emit("deletedFromGroup", deletedUser.getData("userRequest"));
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
    const conversation = await Conversation.findById(conversationId).populate([
        {
            path: "lastMessage",
            select: "from to text seen mediaType mediaUrl createdAt updatedAt",
            populate: {
                path: "from",
                select: "name userProfileImage",
            },
        },
    ]);
    if (!conversation) {
        throw new BadRequestError("No conversation with this id");
    }

    if (!conversation.participants.includes(user._id)) {
        throw new BadRequestError("Can't send message to this group");
    }

    const _id = new mongoose.Types.ObjectId();
    const messageData = {
        _id,
        conversationId: conversation._id,
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
                select: "name userProfileImage",
            },
        },
        { path: "from", select: "name userProfileImage" },
    ]);
    conversation.lastMessage = new mongoose.Types.ObjectId(
        message._id.toString()
    );
    await (
        await conversation.save()
    ).populate("participants", "name userProfileImage");

    const response = {
        success: true,
        message: message.getData(),
        conversation: {
            ...conversation.getData(),
            lastMessage: message.getData(),
        },
    };

    if (ack) {
        ack(response);
    }

    chatNamespace
        .to(`conversation:${conversation._id.toString()}`)
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
                select: "name userProfileImage",
            },
        },
        { path: "participants", select: "name userProfileImage" },
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
