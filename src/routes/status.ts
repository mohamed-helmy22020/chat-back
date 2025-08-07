import express from "express";
import multer from "multer";
import {
    createStatus,
    deleteStatus,
    getFriendsStatuses,
    getUserStatuses,
    seeStatus,
} from "../controllers/status";
import { checkStatus } from "../middleware/checkFiles";
const statusRouter = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage, ...checkStatus });

/**
 * @openapi
 * /status:
 *   get:
 *     tags:
 *       - Status
 *     description: Get user statuses
 *     responses:
 *       200:
 *         description: Get user statuses
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Status'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Not Found
 *       500:
 *         description: Internal Server Error
 *   post:
 *     tags:
 *       - Status
 *     description: Create a new status
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               statusMedia:
 *                 type: string
 *                 format: binary
 *               content:
 *                 type: string
 *                 description: Status text content *
 *     responses:
 *       201:
 *         description: Status created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Status'
 *       400:
 *         description: Bad Request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal Server Error
 */
statusRouter
    .route("/")
    .get(getUserStatuses)
    .post(upload.single("statusMedia"), createStatus);

/**
 * @openapi
 * /status/{statusId}:
 *   delete:
 *     tags:
 *       - Status
 *     description: Delete a status
 *     parameters:
 *       - name: statusId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Delete a status
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Status'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Not Found
 *       500:
 *         description: Internal Server Error
 */
statusRouter.route("/:statusId").delete(deleteStatus);
/**
 * @openapi
 * /status/see/{statusId}:
 *   post:
 *     tags:
 *       - Status
 *     description: See a status
 *     parameters:
 *       - name: statusId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: See a status
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Status'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Not Found
 *       500:
 *         description: Internal Server Error
 */
statusRouter.route("/see/:statusId").post(seeStatus);
/**
 * @openapi
 * /status/friends:
 *   get:
 *     tags:
 *       - Status
 *     description: Get friends statuses
 *     responses:
 *       200:
 *         description: get friends statuses
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Status'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Not Found
 *       500:
 *         description: Internal Server Error
 */
statusRouter.route("/friends").get(getFriendsStatuses);

export default statusRouter;
