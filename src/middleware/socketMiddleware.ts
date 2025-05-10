import { NextFunction, Request, Response } from "express";
import { Server } from "socket.io";

let ioInstance: Server;

export const setSocketIO = (io: Server) => {
    ioInstance = io;
};

export const attachIO = (req: Request, _res: Response, next: NextFunction) => {
    req.io = ioInstance;
    next();
};
