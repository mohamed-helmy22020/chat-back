import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import mongoose from "mongoose";
import { DefaultEventsMap, Socket } from "socket.io";
import { BadRequestError, UnauthenticatedError } from "../errors";
import { getIO } from "../middleware/socketMiddleware";
import Conversation, { ConversationType } from "../models/Conversation";
import Message, { MessageType } from "../models/Message";
import User from "../models/User";

const getPrivateConversation = async (
    userIdA: mongoose.Types.ObjectId,
    userIdB: mongoose.Types.ObjectId
): Promise<ConversationType> => {
    const [id1, id2] = [userIdA.toString(), userIdB.toString()].sort();

    let conversation = await Conversation.findOne({
        participants: {
            $size: 2,
            $all: [id1, id2],
        },
    }).populate("lastMessage", "from to text seen");

    if (!conversation) {
        conversation = await Conversation.create({
            participants: [id1, id2],
        }).then((conv) => conv.populate("lastMessage", "from to text seen"));
    }

    return conversation as unknown as ConversationType;
};

export const sendMessage = async (
    socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>,
    to: mongoose.Types.ObjectId,
    text: string
) => {
    const io = getIO();
    const chatNamespace = io.of("/api/chat");
    const user = await User.findById(
        (socket.request as Request).user._id.toString()
    );
    const otherSide = await User.findById(to);
    if (!otherSide) {
        throw new BadRequestError("No user with this id");
    }

    if (
        otherSide.blockList.includes(user._id as mongoose.Types.ObjectId) ||
        user.blockList.includes(otherSide._id as mongoose.Types.ObjectId)
    ) {
        throw new BadRequestError("Can't send message to this user");
    }
    const conversation = await getPrivateConversation(
        user._id as mongoose.Types.ObjectId,
        to
    );
    const messageData = {
        conversationId: conversation._id,
        from: user._id,
        to,
        text,
    };
    const message = await Message.create(messageData);

    conversation.lastMessage = new mongoose.Types.ObjectId(
        message._id.toString()
    );
    await (
        await conversation.save()
    ).populate("participants", "name userProfileImage");

    chatNamespace
        .to(`user:${to}`)
        .to(`user:${user._id.toString()}`)
        .emit("receiveMessage", {
            success: true,
            message: message.getData(),
            conversation: {
                ...conversation.getData(),
                lastMessage: message.getData(),
            },
        });
    chatNamespace.to(`user:${to}`).emit("typing", {
        conversationId: conversation._id,
        isTyping: false,
    });
};
export const sendTyping = async (
    socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>,
    to: mongoose.Types.ObjectId,
    isTyping: boolean
) => {
    const io = getIO();
    const chatNamespace = io.of("/api/chat");
    const user = (socket.request as Request).user;
    const otherSide = await User.findById(to);
    if (!otherSide) {
        throw new BadRequestError("No user with this id");
    }
    if (
        otherSide.blockList.includes(user._id as mongoose.Types.ObjectId) ||
        user.blockList.includes(otherSide._id as mongoose.Types.ObjectId)
    ) {
        throw new BadRequestError("Can't send message to this user");
    }
    const conversation = await getPrivateConversation(
        user._id as mongoose.Types.ObjectId,
        to
    );
    chatNamespace.to(`user:${to}`).emit("typing", {
        conversationId: conversation._id,
        isTyping,
    });
};

export const getAllConversations = (req: Request, res: Response) => {
    const user = req.user;
    Conversation.find({
        participants: {
            $in: [user._id],
        },
    })
        .populate("lastMessage", "from to text seen createdAt updatedAt")
        .populate("participants", "name userProfileImage")
        .sort("-updatedAt")
        .then((conversations) => {
            res.status(200).json({
                success: true,
                conversations: conversations
                    .filter((convo) => {
                        const cutoff =
                            convo?.userSettings?.get(user._id.toString())
                                ?.messages_cleared_at || new Date(0);
                        const lastMessage = convo.lastMessage as MessageType;
                        return lastMessage?.createdAt > cutoff;
                    })
                    .map((conv) => conv.getData()),
            });
        });
};

export const getConversationMessages = async (req: Request, res: Response) => {
    const user = req.user;
    const { userId: otherSideUserId } = req.params;
    const otherSide = await User.findById(otherSideUserId);
    if (!otherSide) {
        throw new BadRequestError("No user with this id");
    }
    const conversation = await getPrivateConversation(
        user._id as mongoose.Types.ObjectId,
        new mongoose.Types.ObjectId(otherSideUserId)
    );
    const conversationLastMessage =
        conversation.lastMessage as unknown as MessageType;

    if (
        !conversation.participants.includes(user._id as mongoose.Types.ObjectId)
    ) {
        throw new UnauthenticatedError(
            "You can only get your conversations messages"
        );
    }
    if (
        conversationLastMessage &&
        !conversationLastMessage?.seen &&
        conversationLastMessage?.from.toString() !== user._id.toString()
    ) {
        conversationLastMessage.seen = true;
        await conversationLastMessage.save();
    }
    const conversationMessages = (
        await Message.find({
            conversationId: conversation._id,
            createdAt: {
                $gt:
                    conversation.userSettings.get(user._id.toString())
                        ?.messages_cleared_at || new Date(0),
            },
        }).populate("reacts.user", "name userProfileImage")
    ).map((c) => c.getData());

    res.status(StatusCodes.OK).json({
        success: true,
        messages: conversationMessages,
    });
};

export const addMessageReaction = async (req: Request, res: Response) => {
    const user = req.user;
    const { messageId } = req.params;
    const { react } = req.body;
    if (!messageId || !react) {
        throw new BadRequestError("Please provide messageId and react");
    }
    const message = await Message.findById(messageId);
    if (!message) {
        throw new BadRequestError("No message with this id");
    }
    const conversation = await Conversation.findById(message.conversationId);
    if (
        !conversation.participants.includes(user._id as mongoose.Types.ObjectId)
    ) {
        throw new UnauthenticatedError("You can only react to your messages");
    }
    const existingReactIndex = message.reacts.findIndex(
        (r) => r.user.toString() === user._id.toString()
    );
    if (existingReactIndex !== -1) {
        if (message.reacts[existingReactIndex].react === react) {
            message.reacts.splice(existingReactIndex, 1);
        } else {
            message.reacts[existingReactIndex].react = react;
        }
    } else {
        message.reacts.push({
            react,
            user: user._id as mongoose.Types.ObjectId,
        });
    }
    await (
        await message.save()
    ).populate("reacts.user", "name userProfileImage");

    res.status(StatusCodes.OK).json({
        success: true,
        message: message.getData(),
    });
};

export const deleteMessage = async (req: Request, res: Response) => {
    const user = req.user;
    const { messageId } = req.params;
    const message = await Message.findById(messageId);
    if (!message) {
        throw new BadRequestError("No message with this id");
    }
    if (!message.from.equals(user._id as mongoose.Types.ObjectId)) {
        throw new UnauthenticatedError("You can only delete your messages");
    }
    const conversation = await Conversation.findById(message.conversationId);
    await message.deleteOne();
    if (conversation.lastMessage.toString() === message._id.toString()) {
        const newLastMessage = await Message.findOne({
            conversationId: conversation._id,
        })
            .sort({ createdAt: -1 })
            .exec();
        if (newLastMessage) {
            conversation.lastMessage =
                newLastMessage._id as mongoose.Types.ObjectId;
        } else {
            conversation.lastMessage = null;
        }
    }
    res.status(StatusCodes.OK).json({
        success: true,
        message: "Message deleted successfully",
    });
};

export const getUserConversation = async (req: Request, res: Response) => {
    const user = req.user;
    const { userId: otherSideUserId } = req.params;
    const otherSide = await User.findById(otherSideUserId);
    if (!otherSide) {
        throw new BadRequestError("No user with this id");
    }
    const conversation = await (
        await getPrivateConversation(
            user._id as mongoose.Types.ObjectId,
            new mongoose.Types.ObjectId(otherSideUserId)
        )
    ).populate("participants", "name userProfileImage");
    res.status(StatusCodes.OK).json({
        success: true,
        conversation: conversation.getData(),
    });
};

export const deleteConversation = async (req: Request, res: Response) => {
    const user = req.user;
    const { conversationId } = req.params;
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
        throw new BadRequestError("No conversation with this id");
    }
    if (
        !conversation.participants.includes(user._id as mongoose.Types.ObjectId)
    ) {
        throw new UnauthenticatedError(
            "You can only delete your conversations"
        );
    }

    conversation.userSettings.set(user._id.toString(), {
        messages_cleared_at: new Date(),
    });
    await conversation.save();
    res.status(200).json({
        success: true,
        msg: "Conversation deleted successfully",
    });
};
