import { Request } from "express";
import mongoose from "mongoose";
import { DefaultEventsMap, Socket } from "socket.io";
import User from "../models/User";

export const call = async (
    socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>,
    to: mongoose.Types.ObjectId,
    callType: "voice" | "video",
    ack: (data: any) => void
) => {
    const user = (socket.request as Request).user;
    const otherSide = await User.findById(to);
    if (!otherSide) {
        throw new Error("No user with this id");
    }
    if (
        otherSide.blockList.includes(user._id as mongoose.Types.ObjectId) ||
        user.blockList.includes(otherSide._id as mongoose.Types.ObjectId)
    ) {
        throw new Error("Can't call this user");
    }
    const callId = new mongoose.Types.ObjectId();
    socket.to(`user:${to}`).emit("incomingCall", {
        callId,
        from: user.getData("findUser"),
        callType,
    });
    if (ack) ack({ success: true, callId });
};

export const sendSignalData = async (
    socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>,
    to: mongoose.Types.ObjectId,
    callId: mongoose.Types.ObjectId,
    data: any
) => {
    const user = (socket.request as Request).user;
    const otherSide = await User.findById(to);
    if (!otherSide) {
        throw new Error("No user with this id");
    }
    if (
        otherSide.blockList.includes(user._id as mongoose.Types.ObjectId) ||
        user.blockList.includes(otherSide._id as mongoose.Types.ObjectId)
    ) {
        throw new Error("Can't call this user");
    }
    if (!data) {
        throw new Error("No signal data");
    }
    if (!callId) {
        throw new Error("No call id");
    }

    socket.to(`user:${to}`).emit("signal", { callId, signalData: data });
};
