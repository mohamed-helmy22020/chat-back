import { StatusCodes } from "http-status-codes";
import CustomAPIError from "./custom-api";

class BadRequestError extends CustomAPIError {
    constructor(message: string) {
        super(message);
    }
    statusCode = StatusCodes.BAD_REQUEST;
}

export default BadRequestError;
