import "express";
import { Server } from "socket.io";

declare global {
    namespace Express {
        interface Request {
            io: Server;
            _query?: any;
            user?: any;
        }
    }
}
