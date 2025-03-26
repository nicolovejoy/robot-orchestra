import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import ChatInterface from "./ChatInterface";
import { generateChatCompletion } from "@/services/api";

// Mock the API service
jest.mock("@/services/api", () => ({
  generateChatCompletion: jest.fn(),
}));

// Mock scrollIntoView since it's not available in the test environment
window.HTMLElement.prototype.scrollIntoView = jest.fn();

describe("ChatInterface", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders the component and shows initial greeting", async () => {
    render(<ChatInterface />);

    // Advance timers and wrap in act
    await act(async () => {
      jest.advanceTimersByTime(1500);
    });

    await waitFor(() => {
      expect(
        screen.getByText("Hello! How can I help you today?")
      ).toBeInTheDocument();
    });
  });

  it("allows user to input and submit messages", async () => {
    // Mock successful API response
    (generateChatCompletion as jest.Mock).mockResolvedValueOnce({
      success: true,
      data: {
        message: {
          role: "assistant",
          content: "I understand. How can I assist you today?",
        },
      },
    });

    render(<ChatInterface />);

    // Wait for initial greeting
    await act(async () => {
      jest.advanceTimersByTime(1500);
    });

    // Get the input field and submit button
    const input = screen.getByPlaceholderText("Type your message...");
    const submitButton = screen.getByRole("button", { name: /send message/i });

    // Type a message
    await act(async () => {
      fireEvent.change(input, {
        target: { value: "I am doing well, thanks!" },
      });
    });

    // Submit the message
    await act(async () => {
      fireEvent.click(submitButton);
    });

    // Check if user message appears
    expect(screen.getByText("I am doing well, thanks!")).toBeInTheDocument();

    // Advance timers to trigger the response
    await act(async () => {
      jest.advanceTimersByTime(2500);
    });

    // Check if response appears
    await waitFor(() => {
      expect(
        screen.getByText("I understand. How can I assist you today?")
      ).toBeInTheDocument();
    });
  });

  it("handles API errors gracefully", async () => {
    // Mock API error
    (generateChatCompletion as jest.Mock).mockRejectedValueOnce(
      new Error("API Error")
    );

    render(<ChatInterface />);

    // Wait for initial greeting
    await act(async () => {
      jest.advanceTimersByTime(1500);
    });

    // Get the input field and submit button
    const input = screen.getByPlaceholderText("Type your message...");
    const submitButton = screen.getByRole("button", { name: /send message/i });

    // Type and submit a message
    await act(async () => {
      fireEvent.change(input, { target: { value: "Hello" } });
      fireEvent.click(submitButton);
    });

    // Advance timers
    await act(async () => {
      jest.advanceTimersByTime(2500);
    });

    // Check if error message appears
    await waitFor(() => {
      expect(
        screen.getByText(
          "I apologize, but I'm experiencing technical difficulties. Please try again later."
        )
      ).toBeInTheDocument();
    });
  });
});
