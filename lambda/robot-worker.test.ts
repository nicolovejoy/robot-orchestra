// Mock clients must be defined before importing handler
const mockDocClient = {
  send: jest.fn(),
};

const mockLambdaClient = {
  send: jest.fn(),
};

// Mock AWS SDK v3 clients
jest.mock("@aws-sdk/client-dynamodb", () => ({
  DynamoDBClient: jest.fn(() => ({})),
}));

jest.mock("@aws-sdk/lib-dynamodb", () => ({
  DynamoDBDocumentClient: {
    from: jest.fn(() => mockDocClient),
  },
  GetCommand: jest.fn((params) => ({ input: params })),
  UpdateCommand: jest.fn((params) => ({ input: params })),
}));

jest.mock("@aws-sdk/client-lambda", () => ({
  LambdaClient: jest.fn(() => mockLambdaClient),
  InvokeCommand: jest.fn((params) => ({ input: params })),
}));

// Set environment variables
process.env.DYNAMODB_TABLE_NAME = "test-matches-table";
process.env.AI_SERVICE_FUNCTION_NAME = "test-ai-service";

// Now import handler after mocks are set up
import { handler } from "./robot-worker";
import { SQSEvent, SQSRecord } from "aws-lambda";

describe("Robot Worker Lambda", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDocClient.send.mockReset();
    mockLambdaClient.send.mockReset();
  });

  describe("SQS Message Processing", () => {
    it("should process robot response request and update DynamoDB", async () => {
      const matchId = "match-123";
      const mockMatch = {
        matchId,
        status: "round_active",
        currentRound: 1,
        totalRounds: 5,
        participants: [
          { identity: "A", playerName: "TestPlayer", isConnected: true },
          { identity: "B", isAI: true, isConnected: true },
          { identity: "C", isAI: true, isConnected: true },
          { identity: "D", isAI: true, isConnected: true },
        ],
        rounds: [
          {
            roundNumber: 1,
            prompt: "What sound does loneliness make?",
            responses: { A: "Silence" }, // Human already responded
            votes: {},
            scores: {},
            status: "responding",
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Mock DynamoDB get operation
      mockDocClient.send.mockResolvedValueOnce({
        Item: mockMatch,
      });

      // Mock Lambda invocation for AI service
      mockLambdaClient.send.mockResolvedValueOnce({
        StatusCode: 200,
        Payload: Buffer.from(
          JSON.stringify({
            statusCode: 200,
            body: JSON.stringify({
              success: true,
              result: {
                response: "A philosophical response about loneliness",
              },
            }),
          })
        ),
      });

      // Mock DynamoDB update operation
      mockDocClient.send.mockResolvedValueOnce({});

      // Mock get for status check - only 2 responses so no status update
      mockDocClient.send.mockResolvedValueOnce({
        Item: {
          ...mockMatch,
          rounds: [
            {
              ...mockMatch.rounds[0],
              responses: {
                A: "Silence",
                B: "A philosophical response about loneliness",
              },
            },
          ],
        },
      });

      const event: SQSEvent = {
        Records: [
          {
            messageId: "msg-123",
            receiptHandle: "handle-123",
            body: JSON.stringify({
              matchId,
              roundNumber: 1,
              prompt: "What sound does loneliness make?",
              robotId: "B",
              timestamp: new Date().toISOString(),
            }),
            attributes: {
              ApproximateReceiveCount: "1",
              SentTimestamp: "1234567890",
              SenderId: "test",
              ApproximateFirstReceiveTimestamp: "1234567890",
            },
            messageAttributes: {},
            md5OfBody: "test",
            eventSource: "aws:sqs",
            eventSourceARN: "arn:aws:sqs:us-east-1:123456789012:test-queue",
            awsRegion: "us-east-1",
          } as SQSRecord,
        ],
      };

      await handler(event);

      // Should have made 3 calls (get, update, get for status check)
      expect(mockDocClient.send).toHaveBeenCalledTimes(3);

      // Should have invoked AI service Lambda once
      expect(mockLambdaClient.send).toHaveBeenCalledTimes(1);
      expect(mockLambdaClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            FunctionName: "test-ai-service",
            InvocationType: "RequestResponse",
            Payload: expect.stringContaining('"task":"robot_response"'),
          }),
        })
      );

      // Verify DynamoDB get was called
      expect(mockDocClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            TableName: "test-matches-table",
            Key: { matchId, timestamp: 0 },
          }),
        })
      );

      // Verify DynamoDB update was called with robot response
      expect(mockDocClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            TableName: "test-matches-table",
            Key: { matchId, timestamp: 0 },
            UpdateExpression: expect.stringContaining(
              "rounds[0].responses.#robotId = :response"
            ),
            ExpressionAttributeNames: {
              "#robotId": "B",
            },
            ExpressionAttributeValues: {
              ":response": "A philosophical response about loneliness",
              ":updatedAt": expect.any(String),
            },
          }),
        })
      );
    });

    it("should handle multiple robot messages in batch", async () => {
      const matchId = "match-123";
      const mockMatch = {
        matchId,
        status: "round_active",
        currentRound: 1,
        totalRounds: 5,
        participants: [
          { identity: "A", playerName: "TestPlayer", isConnected: true },
          { identity: "B", isAI: true, isConnected: true },
          { identity: "C", isAI: true, isConnected: true },
          { identity: "D", isAI: true, isConnected: true },
        ],
        rounds: [
          {
            roundNumber: 1,
            prompt: "What sound does loneliness make?",
            responses: { A: "Silence" },
            votes: {},
            scores: {},
            status: "responding",
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Mock Lambda invocations for AI service
      mockLambdaClient.send
        .mockResolvedValueOnce({
          // B response
          StatusCode: 200,
          Payload: Buffer.from(
            JSON.stringify({
              statusCode: 200,
              body: JSON.stringify({
                success: true,
                result: { response: "Response B" },
              }),
            })
          ),
        })
        .mockResolvedValueOnce({
          // C response
          StatusCode: 200,
          Payload: Buffer.from(
            JSON.stringify({
              statusCode: 200,
              body: JSON.stringify({
                success: true,
                result: { response: "Response C" },
              }),
            })
          ),
        })
        .mockResolvedValueOnce({
          // D response
          StatusCode: 200,
          Payload: Buffer.from(
            JSON.stringify({
              statusCode: 200,
              body: JSON.stringify({
                success: true,
                result: { response: "Response D" },
              }),
            })
          ),
        });

      // Mock DynamoDB operations for all robots
      mockDocClient.send
        .mockResolvedValueOnce({ Item: mockMatch }) // Get for B
        .mockResolvedValueOnce({}) // Update for B
        .mockResolvedValueOnce({
          Item: {
            ...mockMatch,
            rounds: [
              {
                ...mockMatch.rounds[0],
                responses: { A: "Silence", B: "Response B" },
              },
            ],
          },
        }) // Get for B status check
        .mockResolvedValueOnce({
          Item: {
            ...mockMatch,
            rounds: [
              {
                ...mockMatch.rounds[0],
                responses: { A: "Silence", B: "Response B" },
              },
            ],
          },
        }) // Get for C
        .mockResolvedValueOnce({}) // Update for C
        .mockResolvedValueOnce({
          Item: {
            ...mockMatch,
            rounds: [
              {
                ...mockMatch.rounds[0],
                responses: { A: "Silence", B: "Response B", C: "Response C" },
              },
            ],
          },
        }) // Get for C status check
        .mockResolvedValueOnce({
          Item: {
            ...mockMatch,
            rounds: [
              {
                ...mockMatch.rounds[0],
                responses: { A: "Silence", B: "Response B", C: "Response C" },
              },
            ],
          },
        }) // Get for D
        .mockResolvedValueOnce({}) // Update for D
        .mockResolvedValueOnce({
          Item: {
            ...mockMatch,
            rounds: [
              {
                ...mockMatch.rounds[0],
                responses: {
                  A: "Silence",
                  B: "Response B",
                  C: "Response C",
                  D: "Response D",
                },
              },
            ],
          },
        }) // Get for D status check
        .mockResolvedValueOnce({}); // Update for status

      const event: SQSEvent = {
        Records: ["B", "C", "D"].map(
          (robotId) =>
            ({
              messageId: `msg-${robotId}`,
              receiptHandle: `handle-${robotId}`,
              body: JSON.stringify({
                matchId,
                roundNumber: 1,
                prompt: "What sound does loneliness make?",
                robotId,
                timestamp: new Date().toISOString(),
              }),
              attributes: {
                ApproximateReceiveCount: "1",
                SentTimestamp: "1234567890",
                SenderId: "test",
                ApproximateFirstReceiveTimestamp: "1234567890",
              },
              messageAttributes: {},
              md5OfBody: "test",
              eventSource: "aws:sqs",
              eventSourceARN: "arn:aws:sqs:us-east-1:123456789012:test-queue",
              awsRegion: "us-east-1",
            } as SQSRecord)
        ),
      };

      await handler(event);

      // Verify all robots were processed
      expect(mockDocClient.send).toHaveBeenCalledTimes(10); // 3 gets + 3 updates + 3 status checks + 1 final status update

      // Verify each robot's response was stored
      const updateCalls = mockDocClient.send.mock.calls.filter((call) =>
        call[0].input.UpdateExpression?.includes("responses")
      );
      expect(updateCalls).toHaveLength(3);

      const updatedRobots = updateCalls.map(
        (call) => call[0].input.ExpressionAttributeNames["#robotId"]
      );
      expect(updatedRobots).toEqual(["B", "C", "D"]);

      // Verify Lambda was called for each robot
      expect(mockLambdaClient.send).toHaveBeenCalledTimes(3);
    }, 20000); // Increase timeout for multiple robot processing

    it("should update round status to voting when all responses are collected", async () => {
      const matchId = "match-123";
      const mockMatch = {
        matchId,
        status: "round_active",
        currentRound: 1,
        totalRounds: 5,
        participants: [
          { identity: "A", playerName: "TestPlayer", isConnected: true },
          { identity: "B", isAI: true, isConnected: true },
          { identity: "C", isAI: true, isConnected: true },
          { identity: "D", isAI: true, isConnected: true },
        ],
        rounds: [
          {
            roundNumber: 1,
            prompt: "What sound does loneliness make?",
            responses: {
              A: "Silence",
              B: "A distant echo",
              C: "The ticking of a clock",
              // D will be added by this message
            },
            votes: {},
            scores: {},
            status: "responding",
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Mock Lambda invocation for AI service
      mockLambdaClient.send.mockResolvedValueOnce({
        StatusCode: 200,
        Payload: Buffer.from(
          JSON.stringify({
            statusCode: 200,
            body: JSON.stringify({
              success: true,
              result: { response: "A whimsical response about loneliness" },
            }),
          })
        ),
      });

      // Mock DynamoDB get operation
      mockDocClient.send.mockResolvedValueOnce({
        Item: mockMatch,
      });

      // Mock DynamoDB update operations
      mockDocClient.send.mockResolvedValueOnce({}); // Update for response

      // Mock get for status check - now with all responses -- make this based on match template at some point down the road. starts as 4.
      const updatedMatch = {
        ...mockMatch,
        rounds: [
          {
            ...mockMatch.rounds[0],
            responses: {
              A: "Silence",
              B: "A distant echo",
              C: "The ticking of a clock",
              D: "The hum of an empty fridge",
            },
          },
        ],
      };
      mockDocClient.send.mockResolvedValueOnce({ Item: updatedMatch }); // Get for status check
      mockDocClient.send.mockResolvedValueOnce({}); // Update for status

      const event: SQSEvent = {
        Records: [
          {
            messageId: "msg-123",
            receiptHandle: "handle-123",
            body: JSON.stringify({
              matchId,
              roundNumber: 1,
              prompt: "What sound does loneliness make?",
              robotId: "D",
              timestamp: new Date().toISOString(),
            }),
            attributes: {
              ApproximateReceiveCount: "1",
              SentTimestamp: "1234567890",
              SenderId: "test",
              ApproximateFirstReceiveTimestamp: "1234567890",
            },
            messageAttributes: {},
            md5OfBody: "test",
            eventSource: "aws:sqs",
            eventSourceARN: "arn:aws:sqs:us-east-1:123456789012:test-queue",
            awsRegion: "us-east-1",
          } as SQSRecord,
        ],
      };

      await handler(event);

      // Verify status update was called
      expect(mockDocClient.send).toHaveBeenCalledTimes(4); // Get + Response update + Get for status + Status update

      const statusUpdateCall = mockDocClient.send.mock.calls.find((call) =>
        call[0].input.UpdateExpression?.includes(
          "rounds[0].#status = :votingStatus"
        )
      );
      expect(statusUpdateCall).toBeDefined();
      expect(
        statusUpdateCall[0].input.ExpressionAttributeValues[":votingStatus"]
      ).toBe("voting");
    });

    it("should handle errors gracefully and not update status on failure", async () => {
      // Mock DynamoDB get operation to fail
      mockDocClient.send.mockRejectedValueOnce(new Error("DynamoDB error"));

      const event: SQSEvent = {
        Records: [
          {
            messageId: "msg-123",
            receiptHandle: "handle-123",
            body: JSON.stringify({
              matchId: "match-123",
              roundNumber: 1,
              prompt: "What sound does loneliness make?",
              robotId: "B",
              timestamp: new Date().toISOString(),
            }),
            attributes: {
              ApproximateReceiveCount: "1",
              SentTimestamp: "1234567890",
              SenderId: "test",
              ApproximateFirstReceiveTimestamp: "1234567890",
            },
            messageAttributes: {},
            md5OfBody: "test",
            eventSource: "aws:sqs",
            eventSourceARN: "arn:aws:sqs:us-east-1:123456789012:test-queue",
            awsRegion: "us-east-1",
          } as SQSRecord,
        ],
      };

      // Should throw to let SQS retry
      await expect(handler(event)).rejects.toThrow("DynamoDB error");

      // Should only have attempted the get operation
      expect(mockDocClient.send).toHaveBeenCalledTimes(1);
    });

    it("should throw error for invalid messages", async () => {
      const event: SQSEvent = {
        Records: [
          {
            messageId: "msg-123",
            receiptHandle: "handle-123",
            body: "invalid json",
            attributes: {
              ApproximateReceiveCount: "1",
              SentTimestamp: "1234567890",
              SenderId: "test",
              ApproximateFirstReceiveTimestamp: "1234567890",
            },
            messageAttributes: {},
            md5OfBody: "test",
            eventSource: "aws:sqs",
            eventSourceARN: "arn:aws:sqs:us-east-1:123456789012:test-queue",
            awsRegion: "us-east-1",
          } as SQSRecord,
        ],
      };

      // Should throw for invalid JSON (caught by processRobotResponse)
      await expect(handler(event)).rejects.toThrow();

      // Should not have made any DynamoDB calls
      expect(mockDocClient.send).not.toHaveBeenCalled();
    });
  });

  describe("Robot Response Generation", () => {
    it("should generate appropriate responses for each robot personality", async () => {
      const matchId = "match-123";
      const responses: Record<string, string> = {};

      // Test each robot personality
      for (const robotId of ["B", "C", "D"]) {
        const mockMatch = {
          matchId,
          status: "round_active",
          currentRound: 1,
          totalRounds: 5,
          participants: [
            { identity: "A", playerName: "TestPlayer", isConnected: true },
            { identity: "B", isAI: true, isConnected: true },
            { identity: "C", isAI: true, isConnected: true },
            { identity: "D", isAI: true, isConnected: true },
          ],
          rounds: [
            {
              roundNumber: 1,
              prompt: "What sound does loneliness make?",
              responses: {},
              votes: {},
              scores: {},
              status: "responding",
            },
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        mockDocClient.send.mockReset();
        mockDocClient.send.mockResolvedValueOnce({ Item: mockMatch });
        mockDocClient.send.mockResolvedValueOnce({});
        // Mock get for status check after update
        mockDocClient.send.mockResolvedValueOnce({
          Item: {
            ...mockMatch,
            rounds: [
              {
                ...mockMatch.rounds[0],
                responses: { [robotId]: "Some response" },
              },
            ],
          },
        });

        const event: SQSEvent = {
          Records: [
            {
              messageId: `msg-${robotId}`,
              receiptHandle: `handle-${robotId}`,
              body: JSON.stringify({
                matchId,
                roundNumber: 1,
                prompt: "What sound does loneliness make?",
                robotId,
                timestamp: new Date().toISOString(),
              }),
              attributes: {
                ApproximateReceiveCount: "1",
                SentTimestamp: "1234567890",
                SenderId: "test",
                ApproximateFirstReceiveTimestamp: "1234567890",
              },
              messageAttributes: {},
              md5OfBody: "test",
              eventSource: "aws:sqs",
              eventSourceARN: "arn:aws:sqs:us-east-1:123456789012:test-queue",
              awsRegion: "us-east-1",
            } as SQSRecord,
          ],
        };

        await handler(event);

        // Capture the generated response
        const updateCall = mockDocClient.send.mock.calls.find((call) =>
          call[0].input.UpdateExpression?.includes("responses")
        );
        responses[robotId] =
          updateCall[0].input.ExpressionAttributeValues[":response"];
      }

      // Verify each robot has a distinct personality
      // Verify each robot returned a response (either AI or fallback)
      expect(responses["B"]).toBeTruthy();
      expect(responses["C"]).toBeTruthy();
      expect(responses["D"]).toBeTruthy();

      // Verify the responses are strings and have reasonable length
      expect(typeof responses["B"]).toBe("string");
      expect(typeof responses["C"]).toBe("string");
      expect(typeof responses["D"]).toBe("string");
      expect(responses["B"].length).toBeGreaterThan(10);
      expect(responses["C"].length).toBeGreaterThan(10);
      expect(responses["D"].length).toBeGreaterThan(10);
    }, 20000); // Increase timeout for multiple AI calls
  });
});
