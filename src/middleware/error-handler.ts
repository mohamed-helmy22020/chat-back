import { NextFunction, Request, Response } from "express";

const { StatusCodes } = require("http-status-codes");
const errorHandlerMiddleware = (
    err: any,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    console.log({ err });
    let customError = {
        statusCode: err.statusCode || StatusCodes.INTERNAL_SERVER_ERROR,
        msg: err.message || "Something went wrong, try again later",
    };

    if (err.code === "LIMIT_UNEXPECTED_FILE") {
        customError.msg = "Upload only one file.";
        customError.statusCode = StatusCodes.BAD_REQUEST;
    }

    if (err.name === "ValidationError") {
        customError.msg = Object.values(err.errors)
            .map((item: any) => item.message)
            .join(". ");
        customError.statusCode = StatusCodes.BAD_REQUEST;
    }

    if (err.code && err.code === 11000) {
        console.log(err);
        customError.msg = `${Object.keys(err.keyValue)} is already exist`;
        customError.statusCode = StatusCodes.BAD_REQUEST;
    }

    if (err.name === "CastError") {
        customError.msg = `No item found with id: ${err.value}`;
        customError.statusCode = StatusCodes.NOT_FOUND;
        if (err.message.toLowerCase().includes("cast to number failed")) {
            customError.msg = `${err.path} should be number.`;
            customError.statusCode = StatusCodes.BAD_REQUEST;
        }
        if (err.message.toLowerCase().includes("cast to objectid failed")) {
            customError.msg = `No item found with this id`;
            customError.statusCode = StatusCodes.NOT_FOUND;
        }
    }
    res.status(customError.statusCode).json({ msg: customError.msg });
    return;
};

export default errorHandlerMiddleware;
