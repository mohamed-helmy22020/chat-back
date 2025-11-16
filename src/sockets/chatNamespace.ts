import { type Request } from "express";
import { Server } from "socket.io";
import { sendMessage, sendTyping } from "../controllers/chat";

const registerChatNamespace = (io: Server) => {
    const chatNamespace = io.of("/api/chat");
    chatNamespace.on("connection", (socket) => {
        console.log("A user connected to chat namespace");

        const req = socket.request as Request;
        const user = req.user;
        console.log("user", user.id);

        if (!user) {
            socket.disconnect();
        }

        socket.join(`user:${user._id.toString()}`);

        socket.on("sendPrivateMessage", async (to, text) => {
            try {
                await sendMessage(socket, to, text);
            } catch (error) {
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
