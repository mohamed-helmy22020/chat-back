import express from "express";
import multer from "multer";
import { checkPicture } from "../middleware/checkFiles";
const storage = multer.memoryStorage();
const upload = multer({ storage, ...checkPicture });

import {
    acceptFriendRequest,
    addFriend,
    blockUser,
    cancelFriendRequest,
    deleteFriend,
    findUser,
    getBlockedList,
    getFriendRequests,
    getFriendsList,
    getSentRequests,
    getUserData,
    unblockUser,
    updateUserData,
} from "../controllers/user";
const userRouter = express.Router();

/**
 * @openapi
 * /user/data:
 *   get:
 *     tags:
 *       - User
 *     summary: get user data
 *     responses:
 *       200:
 *         description: get user data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Not Found
 *       500:
 *         description: Internal Server Error
 *   post:
 *     tags:
 *       - User
 *     summary: update user data
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 default: John Doe
 *               phone:
 *                 type: string
 *                 default: 1234567890
 *               profilePicture:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Login
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Not Found
 *       500:
 *         description: Internal Server Error
 */
userRouter
    .route("/data")
    .get(getUserData)
    .post(upload.single("profilePicture"), updateUserData);

/**
 * @openapi
 * /user/block/{userId}:
 *   post:
 *     tags:
 *       - User
 *     summary: block user
 *     parameters:
 *       - in: path
 *         name: userId
 *         schema:
 *           type: string
 *         required: true
 *         description: user id
 *     responses:
 *       200:
 *         description: block user
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Not Found
 *       500:
 *         description: Internal Server Error
 */
userRouter.route("/block/:userId").post(blockUser);

/**
 * @openapi
 * /user/unblock/{userId}:
 *   post:
 *     tags:
 *       - User
 *     summary: unblock user
 *     parameters:
 *       - in: path
 *         name: userId
 *         schema:
 *           type: string
 *         required: true
 *         description: user id
 *     responses:
 *       200:
 *         description: unblock user
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Not Found
 *       500:
 *         description: Internal Server Error
 */
userRouter.route("/unblock/:userId").post(unblockUser);

/**
 * @openapi
 * /user/friend/{userId}:
 *   post:
 *     tags:
 *       - User
 *     summary: add friend
 *     parameters:
 *       - in: path
 *         name: userId
 *         schema:
 *           type: string
 *         required: true
 *         description: user id
 *     responses:
 *       200:
 *         description: add friend
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Not Found
 *       500:
 *         description: Internal Server Error
 *   delete:
 *     tags:
 *       - User
 *     summary: delete friend
 *     parameters:
 *       - in: path
 *         name: userId
 *         schema:
 *           type: string
 *         required: true
 *         description: user id
 *     responses:
 *       200:
 *         description: delete friend
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Not Found
 *       500:
 *         description: Internal Server Error
 */
userRouter.route("/friend/:userId").post(addFriend).delete(deleteFriend);

/**
 * @openapi
 * /user/accept-friend/{userId}:
 *   post:
 *     tags:
 *       - User
 *     summary: accept friend request
 *     parameters:
 *       - in: path
 *         name: userId
 *         schema:
 *           type: string
 *         required: true
 *         description: user id
 *     responses:
 *       200:
 *         description: accept friend request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Not Found
 *       500:
 *         description: Internal Server Error
 */
userRouter.route("/accept-friend/:userId").post(acceptFriendRequest);

/**
 * @openapi
 * /user/cancel-friend-request/{userId}:
 *   delete:
 *     tags:
 *       - User
 *     summary: cancel friend request
 *     parameters:
 *       - in: path
 *         name: userId
 *         schema:
 *           type: string
 *         required: true
 *         description: user id
 *     responses:
 *       200:
 *         description: cancel friend request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Not Found
 *       500:
 *         description: Internal Server Error
 */
userRouter.route("/cancel-friend-request/:userId").delete(cancelFriendRequest);

/**
 * @openapi
 * /user/friends:
 *   get:
 *     tags:
 *       - User
 *     summary: get friends list
 *     responses:
 *       200:
 *         description: get friends list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 friends:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/UserRequest'
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Not Found
 *       500:
 *         description: Internal Server Error
 * /user/friend-requests:
 *   get:
 *     tags:
 *       - User
 *     summary: get friend requests
 *     responses:
 *       200:
 *         description: get friend requests
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 friendRequests:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/UserRequest'
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Not Found
 *       500:
 *         description: Internal Server Error
 * /user/sent-requests:
 *   get:
 *     tags:
 *       - User
 *     summary: get sent requests
 *     responses:
 *       200:
 *         description: get sent requests
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 sentRequests:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/UserRequest'
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Not Found
 *       500:
 *         description: Internal Server Error
 */
userRouter.route("/friends").get(getFriendsList);
userRouter.route("/friend-requests").get(getFriendRequests);
userRouter.route("/sent-requests").get(getSentRequests);

/**
 * @openapi
 * /user/find/{userEmail}:
 *   get:
 *     tags:
 *       - User
 *     summary: find user
 *     parameters:
 *       - in: path
 *         name: userEmail
 *         schema:
 *           type: string
 *         required: true
 *         description: user email
 *     responses:
 *       200:
 *         description: find user
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 user:
 *                   $ref: '#/components/schemas/FindUser'
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Not Found
 *       500:
 *         description: Internal Server Error
 */
userRouter.route("/find/:userEmail").get(findUser);

/**
 * @openapi
 * /user/blocked:
 *   get:
 *     tags:
 *       - User
 *     summary: get blocked list
 *     responses:
 *       200:
 *         description: get blocked list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 blockedUsers:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/UserRequest'
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Not Found
 *       500:
 *         description: Internal Server Error
 */
userRouter.route("/blocked").get(getBlockedList);
export default userRouter;
