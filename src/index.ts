import cors from "cors";
import "dotenv/config";
import express from "express";
import rateLimiter from "express-rate-limit";
import fs from "fs";
import helmet from "helmet";
import http from "http";
import https from "https";
import { Server } from "socket.io";
import connectDB from "./db/connect";
import authenticateUser from "./middleware/authentication";
import errorHandlerMiddleware from "./middleware/error-handler";
import notFoundMiddleware from "./middleware/not-found";
import { attachIO, setSocketIO } from "./middleware/socketMiddleware";
import authRouter from "./routes/auth";
import chatRouter from "./routes/chat";
import statusRouter from "./routes/status";
import userRouter from "./routes/user";
import registerSocketNamespaces from "./sockets";
import swaggerDocs from "./utils/swagger";

const app = express();
const keyPath = "./src/public/cert-key.pem";
const certPath = "./src/public/cert.pem";

let httpServer;

// Helper to check if file exists and is readable
function fileExists(path: string) {
    try {
        fs.accessSync(path, fs.constants.R_OK);
        return true;
    } catch {
        return false;
    }
}
if (fileExists(keyPath) && fileExists(certPath)) {
    const options = {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath),
    };
    httpServer = https.createServer(options, app);
} else {
    httpServer = http.createServer(app);
}
const io = new Server(httpServer, {
    cors: {
        origin: ["https://localhost:3000"],
    },
    maxHttpBufferSize: 1e8,
});

setSocketIO(io);
app.use(attachIO);

// extra packages
app.set("trust proxy", 1);
app.use(
    rateLimiter({
        windowMs: 1 * 60 * 1000, // 1 minutes
        max: 100, // limit each IP to 100 requests per windowMs
    })
);
app.use(helmet());
app.use(cors({ origin: "http://localhost:3000" }));

app.get("/", (req, res) => {
    res.send("Chat app Api");
});

//Swagger
swaggerDocs(app);

//Routes
app.use(express.json());
app.use("/api/auth", authRouter);
app.use("/api/user", authenticateUser, userRouter);
app.use("/api/chat", authenticateUser, chatRouter);
app.use("/api/status", authenticateUser, statusRouter);

app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware);
io.engine.use(authenticateUser);

const port = process.env.PORT || 5000;

const start = async () => {
    try {
        await connectDB(process.env.MONGO_URI);

        // Load socket namespaces
        registerSocketNamespaces(io);

        httpServer.listen(port, () => {
            console.log("=============================================");
            console.log(`Server is listening on http://localhost:${port}/`);
            console.log("Swagger docs available at http://localhost:5000/docs");
        });
    } catch (error) {
        console.log(error);
    }
};
start();
