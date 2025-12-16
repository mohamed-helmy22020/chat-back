import express from "express";
import {
    addMessageReaction,
    deleteConversation,
    deleteMessage,
    forwardMessage,
    getAllConversations,
    getConversationMessages,
    getUserConversation,
    getUserConversationWithEmail,
} from "../controllers/chat";
const chatRouter = express.Router();

/**
 * @openapi
 * /chat/conversations:
 *   get:
 *     tags:
 *       - Chat
 *     security:
 *       - bearerAuth: []
 *     summary: get all conversations
 *     responses:
 *       200:
 *         description: get all conversations
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 conversations:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Conversation'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Not Found
 *       500:
 *         description: Internal Server Error
 */
chatRouter.route("/conversations").get(getAllConversations);

/**
 * @openapi
 * /chat/conversations/user/{userId}:
 *   get:
 *     tags:
 *       - Chat
 *     security:
 *       - bearerAuth: []
 *     summary: get user conversation
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: get user conversation
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 conversation:
 *                   $ref: '#/components/schemas/Conversation'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Not Found
 *       500:
 *         description: Internal Server Error
 */
chatRouter.route("/conversations/user/:userId").get(getUserConversation);
chatRouter
    .route("/conversations/user/email/:email")
    .get(getUserConversationWithEmail);

/**
 * @openapi
 * /chat/conversations/messages/{userId}:
 *   get:
 *     tags:
 *       - Chat
 *     security:
 *       - bearerAuth: []
 *     summary: get conversation messages
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: get conversation messages
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 messages:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Message'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Not Found
 *       500:
 *         description: Internal Server Error
 */
chatRouter
    .route("/conversations/messages/:userId")
    .get(getConversationMessages);

chatRouter.route("/conversations/:conversationId").delete(deleteConversation);

chatRouter.route("/message/forward/:messageId").post(forwardMessage);
/**
 * @openapi
 * /chat/message/{messageId}/react:
 *   post:
 *     tags:
 *       - Chat
 *     security:
 *       - bearerAuth: []
 *     summary: react to a message
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               react:
 *                 type: string
 *     responses:
 *       200:
 *         description: react to a message
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   $ref: '#/components/schemas/Message'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Not Found
 *       500:
 *         description: Internal Server Error
 */
chatRouter.route("/message/:messageId/react").post(addMessageReaction);

/**
 * @openapi
 * /chat/message/{messageId}:
 *   delete:
 *     tags:
 *       - Chat
 *     security:
 *       - bearerAuth: []
 *     summary: delete a message
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: delete a message
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Not Found
 *       500:
 *         description: Internal Server Error
 */
chatRouter.route("/message/:messageId").delete(deleteMessage);

export default chatRouter;
