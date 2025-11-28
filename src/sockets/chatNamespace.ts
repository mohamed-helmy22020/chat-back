import { type Request } from "express";
import { Server } from "socket.io";
import { sendMessage, sendTyping } from "../controllers/chat";
import { checkSocketPics } from "../middleware/checkFiles";

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

        socket.on("disconnect", () => {
            console.log("A user disconnected from chat namespace");
        });
    });
};

export default registerChatNamespace;
