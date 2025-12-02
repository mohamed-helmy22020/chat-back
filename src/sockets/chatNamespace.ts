import { type Request } from "express";
import { Server } from "socket.io";
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
        onlineUsers.set(user._id.toString(), true);
        try {
            emitUserIsOnline(socket, true);
        } catch (error) {
            console.log(error);
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
                chatNamespace
                    .to(`user:${user._id.toString()}`)
                    .emit("errors", error.message);
            }
        });

        socket.on("seeAllMessages", async (to, ack) => {
            try {
                await seeMessages(socket, to, ack);
            } catch (error) {
                chatNamespace
                    .to(`user:${user._id.toString()}`)
                    .emit("errors", error.message);
            }
        });

        socket.on("disconnect", () => {
            onlineUsers.set(user._id.toString(), false);
            try {
                emitUserIsOnline(socket, false);
            } catch (error) {
                console.log(error);
            }
            console.log("A user disconnected from chat namespace");
        });
    });
};

export default registerChatNamespace;
