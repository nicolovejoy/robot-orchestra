import { Request, Response, NextFunction } from "express";
import { aiService, ChatMessage } from "../services/aiService";
import { z } from "zod";

// Validation schema for chat completion request
const chatCompletionSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["system", "user", "assistant"]),
      content: z.string(),
    })
  ),
  model: z.string().optional(),
});

/**
 * Controller for handling chat-related API endpoints
 */
export const chatController = {
  /**
   * Generate a chat completion response
   */
  generateChatCompletion: async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Validate request body
      const validationResult = chatCompletionSchema.safeParse(req.body);

      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          error: "Invalid request format",
          details: validationResult.error.format(),
        });
        return;
      }

      const { messages, model } = validationResult.data;

      // Call AI service to generate response
      const response = await aiService.generateChatCompletion({
        messages,
        ...(model ? { model } : {}),
      });

      res.status(200).json({
        success: true,
        data: response,
      });
    } catch (error) {
      console.error("Chat controller error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to generate chat completion",
      });
    }
  },
};
