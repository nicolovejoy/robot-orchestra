import express from "express";
import { chatController } from "../controllers/chatController";

const router = express.Router();

// POST /api/chat/completions - Generate a chat completion
router.post("/completions", chatController.generateChatCompletion);

export default router;
