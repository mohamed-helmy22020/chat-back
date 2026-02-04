import { Server } from "socket.io";
import registerChatNamespace from "./chatNamespace";

const registerSocketNamespaces = (io: Server) => {
    registerChatNamespace(io);
    console.log("Socket.IO namespaces are registered");
};

export default registerSocketNamespaces;
