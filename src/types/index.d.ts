import { JwtPayload } from "jsonwebtoken";

interface CustomJwtPayload extends JwtPayload {
    email: string;
    userId: string;
}
