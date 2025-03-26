import OpenAI from "openai";
import { config } from "../config";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || config.openai.apiKey,
});

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatCompletionRequest {
  messages: ChatMessage[];
  model?: string;
}

export interface ChatCompletionResponse {
  message: ChatMessage;
}

/**
 * Service to handle interactions with OpenAI's API
 */
export class AIService {
  /**
   * Generate a chat completion response from OpenAI
   */
  async generateChatCompletion(
    request: ChatCompletionRequest
  ): Promise<ChatCompletionResponse> {
    try {
      // Default model if not specified
      const model = request.model || "gpt-3.5-turbo";

      const response = await openai.chat.completions.create({
        model,
        messages: request.messages,
        temperature: 0.7,
        max_tokens: 500,
      });

      // Extract the response message
      const responseMessage = response.choices[0]?.message;

      if (!responseMessage) {
        throw new Error("No response from the AI model");
      }

      return {
        message: {
          role: responseMessage.role,
          content: responseMessage.content || "",
        },
      };
    } catch (error) {
      console.error("Error generating AI response:", error);
      throw error;
    }
  }
}

// Export singleton instance
export const aiService = new AIService();
