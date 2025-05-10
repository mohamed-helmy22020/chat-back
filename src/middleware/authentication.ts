import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { CustomJwtPayload } from "types";
import { UnauthenticatedError } from "../errors";
import User from "../models/User";

const authenticateUser = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const isHandshake = req._query?.sid === undefined;
    if (!isHandshake) {
        return next();
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return next(new UnauthenticatedError("You are not authenticated"));
    }
    const token = authHeader.split(" ")[1];
    try {
        const payload = jwt.verify(
            token,
            process.env.ACCESS_TOKEN_SECRET
        ) as CustomJwtPayload;
        const user = await User.findOne({ _id: payload.userId });
        if (!user) {
            return next(new UnauthenticatedError("You are not authenticated"));
        }
        req.user = user;
        next();
    } catch (error) {
        return next(new UnauthenticatedError("You are not authenticated"));
    }
};

export default authenticateUser;
