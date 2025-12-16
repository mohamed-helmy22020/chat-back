import { type Request } from "express";
import { Server } from "socket.io";
import { call, sendSignalData } from "../controllers/call";
import { seeMessages, sendMessage, sendTyping } from "../controllers/chat";
import { emitUserIsOnline } from "../controllers/user";
import { checkSocketPics } from "../middleware/checkFiles";

export const onlineUsers = new Map<string, boolean>();

const registerChatNamespace = (io: Server) => {
    const chatNamespace = io.of("/api/chat");
    chatNamespace.on("connection", (socket) => {
        console.log("A user connected to chat namespace");

        const req = socket.request as Request;
        const user = req.user;

        if (!user) {
            socket.disconnect();
        }

        socket.join(`user:${user._id.toString()}`);
        if (user.settings.privacy.online !== "None") {
            onlineUsers.set(user._id.toString(), true);
            try {
                emitUserIsOnline(socket, true);
            } catch (error) {
                console.log(error);
            }
        }

        socket.on("sendPrivateMessage", async (to, text, media, ack) => {
            try {
                if (!media && !text) {
                    throw new Error("Message text or media is required.");
                }
                if (media) {
                    checkSocketPics(media);
                }
                await sendMessage(socket, to, text, media, ack);
            } catch (error) {
                if (ack) ack({ success: false, error: error.message });
                chatNamespace
                    .to(`user:${user._id.toString()}`)
                    .emit("errors", error.message);
            }
        });

        socket.on("typing", async (to, isTyping) => {
            try {
                await sendTyping(socket, to, isTyping);
            } catch (error) {
                console.log(error);
            }
        });

        socket.on("seeAllMessages", async (to, ack) => {
            if (user.settings.privacy.readReceipts === "Disable") return;
            try {
                await seeMessages(socket, to, ack);
            } catch (error) {
                console.log(error);
            }
        });

        socket.on("call", async (to, callType, ack) => {
            try {
                if (callType !== "voice" && callType !== "video") {
                    throw new Error("Invalid call type");
                }
                if (onlineUsers.get(to.toString()) === false) {
                    throw new Error("User is not online");
                }
                await call(socket, to, callType, ack);
            } catch (error) {
                ack({ success: false, error: error.message });
            }
        });

        socket.on("acceptCall", async (to, callId, ack) => {
            try {
                socket.to(`user:${to}`).emit("callAccepted", callId);
            } catch (error) {
                console.log(error);
            }
        });

        socket.on("endCall", async (to, callId) => {
            try {
                socket.to(`user:${to}`).emit("callEnded", callId);
            } catch (error) {
                console.log(error);
            }
        });
        socket.on("signal", async ({ to, callId, data }) => {
            try {
                await sendSignalData(socket, to, callId, data);
            } catch (error) {
                console.log(error);
            }
        });

        socket.on("disconnect", () => {
            if (user.settings.privacy.online !== "None") {
                onlineUsers.set(user._id.toString(), false);
                try {
                    emitUserIsOnline(socket, false);
                } catch (error) {
                    console.log(error);
                }
                console.log("A user disconnected from chat namespace");
            }
        });
    });
};

export default registerChatNamespace;
