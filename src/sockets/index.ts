import { Server } from "socket.io";
import registerChatNamespace from "./chatNamespace";

const registerSocketNamespaces = (io: Server) => {
    registerChatNamespace(io);
    console.log("Socket.IO namespaces registered");
};

export default registerSocketNamespaces;
