import { StatusCodes } from "http-status-codes";
import CustomAPIError from "./custom-api";

class UnauthenticatedError extends CustomAPIError {
    constructor(message: string) {
        super(message);
    }
    statusCode = StatusCodes.UNAUTHORIZED;
}

export default UnauthenticatedError;
