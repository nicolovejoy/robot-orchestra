import {
  generateChatCompletion,
  ChatMessage,
  loginUser,
  registerUser,
  logoutUser,
  getUserProfile,
} from "./api";

// Mock the global fetch function
global.fetch = jest.fn();

// Mock setTimeout to speed up tests
jest.useFakeTimers();

describe("generateChatCompletion", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Reset environment variables
    process.env = { ...originalEnv };
    process.env.NEXT_PUBLIC_API_URL = "http://localhost:5000";
  });

  afterEach(() => {
    // Restore environment variables
    process.env = originalEnv;
  });

  it("should successfully generate a chat completion", async () => {
    // Mock successful response
    const mockResponse = {
      success: true,
      data: {
        message: {
          role: "assistant" as const,
          content: "Hello! How can I help you today?",
        },
      },
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const request = {
      messages: [{ role: "user" as const, content: "Hello" }],
    };

    const result = await generateChatCompletion(request);

    expect(result).toEqual(mockResponse);
    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:5000/api/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      }
    );
  });

  it("should handle API errors gracefully", async () => {
    // Mock error response
    const errorMessage = "API Error";
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: errorMessage }),
    });

    const request = {
      messages: [{ role: "user" as const, content: "Hello" }],
    };

    const result = await generateChatCompletion(request);

    expect(result).toEqual({
      success: false,
      error: errorMessage,
    });
  });

  it("should handle network errors gracefully", async () => {
    // Mock network error
    (global.fetch as jest.Mock).mockRejectedValueOnce(
      new Error("Network Error")
    );

    const request = {
      messages: [{ role: "user" as const, content: "Hello" }],
    };

    const result = await generateChatCompletion(request);

    expect(result).toEqual({
      success: false,
      error: "Network Error",
    });
  });

  it("should use custom API URL from environment variable", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://custom-api.example.com";

    const mockResponse = {
      success: true,
      data: {
        message: {
          role: "assistant" as const,
          content: "Hello!",
        },
      },
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const request = {
      messages: [{ role: "user" as const, content: "Hello" }],
    };

    await generateChatCompletion(request);

    expect(global.fetch).toHaveBeenCalledWith(
      "https://custom-api.example.com/api/chat/completions",
      expect.any(Object)
    );
  });

  it("should handle unknown errors gracefully", async () => {
    // Mock unknown error type
    (global.fetch as jest.Mock).mockRejectedValueOnce("Unknown error");

    const request = {
      messages: [{ role: "user" as const, content: "Hello" }],
    };

    const result = await generateChatCompletion(request);

    expect(result).toEqual({
      success: false,
      error: "An unknown error occurred",
    });
  });
});

describe("loginUser", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should successfully login with demo credentials", async () => {
    const credentials = {
      email: "demo@example.com",
      password: "password",
    };

    // Use jest.runAllTimers() to immediately resolve the setTimeout
    const loginPromise = loginUser(credentials);
    jest.runAllTimers();
    const result = await loginPromise;

    expect(result).toEqual({
      user: {
        id: "user-123",
        name: "Demo User",
        email: "demo@example.com",
      },
      token: "fake-jwt-token-xyz",
    });
  });

  it("should throw error with invalid credentials", async () => {
    const credentials = {
      email: "wrong@example.com",
      password: "wrongpass",
    };

    const loginPromise = loginUser(credentials);
    jest.runAllTimers();
    await expect(loginPromise).rejects.toThrow("Invalid credentials");
  });

  it("should throw error when email and password are missing", async () => {
    const credentials = {} as any;
    const loginPromise = loginUser(credentials);
    jest.runAllTimers();
    await expect(loginPromise).rejects.toThrow(
      "Email and password are required"
    );
  });
});

describe("registerUser", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock Date.now() to return a consistent value
    jest.spyOn(Date, "now").mockImplementation(() => 1742954770454);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should successfully register a new user", async () => {
    const credentials = {
      name: "New User",
      email: "new@example.com",
      password: "password123",
    };

    const registerPromise = registerUser(credentials);
    jest.runAllTimers();
    const result = await registerPromise;

    expect(result).toEqual({
      user: {
        id: "user-1742954770454",
        name: credentials.name,
        email: credentials.email,
      },
      token: "fake-jwt-token-new-user",
    });
  });

  it("should throw error when required fields are missing", async () => {
    const credentials = {
      email: "new@example.com",
    } as any;

    const registerPromise = registerUser(credentials);
    jest.runAllTimers();
    await expect(registerPromise).rejects.toThrow(
      "Name, email, and password are required"
    );
  });
});

describe("logoutUser", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should successfully logout", async () => {
    const logoutPromise = logoutUser();
    jest.runAllTimers();
    await expect(logoutPromise).resolves.toBeUndefined();
  });
});

describe("getUserProfile", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock random and date for consistent test results
    jest.spyOn(Math, "random").mockReturnValue(0.5);
    jest
      .spyOn(Date.prototype, "toISOString")
      .mockReturnValue("2025-03-26T02:06:12.071Z");
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should return user profile data", async () => {
    const profilePromise = getUserProfile();
    jest.runAllTimers();
    const result = await profilePromise;

    expect(result).toEqual({
      name: "Demo User",
      email: "demo@example.com",
      joined: "2025-03-26T02:06:12.071Z",
      usageCount: 25, // Math.floor(0.5 * 50)
    });
  });
});
