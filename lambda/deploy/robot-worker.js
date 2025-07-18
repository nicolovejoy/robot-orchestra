"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const client_lambda_1 = require("@aws-sdk/client-lambda");
const client_sqs_1 = require("@aws-sdk/client-sqs");
// Initialize AWS clients
const dynamoClient = new client_dynamodb_1.DynamoDBClient({});
const docClient = lib_dynamodb_1.DynamoDBDocumentClient.from(dynamoClient, {
    marshallOptions: {
        removeUndefinedValues: true,
    },
});
const lambdaClient = new client_lambda_1.LambdaClient({});
const sqsClient = new client_sqs_1.SQSClient({});
// Get environment variables
const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || 'robot-orchestra-matches';
const AI_SERVICE_FUNCTION_NAME = process.env.AI_SERVICE_FUNCTION_NAME || 'robot-orchestra-ai-service';
const STATE_UPDATE_QUEUE_URL = process.env.STATE_UPDATE_QUEUE_URL || '';
// Robot personalities for response generation
const robotPersonalities = {
    'B': {
        style: 'poetic',
        responses: [
            'Like whispers in the twilight, it dances on the edge of perception',
            'A symphony of shadows, playing in minor keys',
            'Crystalline fragments of yesterday, scattered across tomorrow',
            'It breathes in colors that have no names',
            'Soft as moth wings against the window of time',
        ],
    },
    'C': {
        style: 'analytical',
        responses: [
            'Approximately 42 decibels of introspective resonance',
            'The quantifiable essence measures 3.7 on the emotional scale',
            'Statistical analysis suggests a correlation with ambient frequencies',
            'Data indicates a wavelength between visible and invisible spectrums',
            'Empirically speaking, it registers as a null hypothesis of sensation',
        ],
    },
    'D': {
        style: 'whimsical',
        responses: [
            'Like a disco ball made of butterflies!',
            'It\'s the giggles of invisible unicorns, obviously',
            'Tastes like purple mixed with the sound of Tuesday',
            'Bouncy castle vibes but for your feelings',
            'Imagine a kazoo orchestra playing underwater ballet',
        ],
    },
};
// Map robot IDs to AI personalities and dwarf names
const robotToPersonality = {
    'B': 'philosopher', // poetic → philosopher
    'C': 'scientist', // analytical → scientist
    'D': 'comedian' // whimsical → comedian
};
// Map robot IDs to dwarf names for consistent identity
const robotToDwarfName = {
    'B': 'Doc', // The wise philosopher (Doc seems fitting)
    'C': 'Happy', // The analytical scientist (ironic but memorable)
    'D': 'Dopey' // The whimsical comedian (perfect match)
};
async function generateRobotResponse(prompt, robotId, roundNumber) {
    const personality = robotToPersonality[robotId];
    if (!personality) {
        console.warn(`Unknown robot ID: ${robotId}, using fallback`);
        return generateFallbackResponse(prompt, robotId);
    }
    try {
        // Invoke AI service Lambda
        const requestBody = {
            task: 'robot_response',
            model: 'claude-3-haiku', // Fast model for real-time responses
            inputs: {
                personality,
                prompt,
                context: roundNumber ? { round: roundNumber } : undefined
            },
            options: {
                temperature: 0.85,
                maxTokens: 150
            }
        };
        // Format as API Gateway event since AI service expects that format
        const payload = {
            httpMethod: 'POST',
            body: JSON.stringify(requestBody)
        };
        console.log(`Invoking AI service for robot ${robotId} with personality ${personality}`);
        const response = await lambdaClient.send(new client_lambda_1.InvokeCommand({
            FunctionName: AI_SERVICE_FUNCTION_NAME,
            InvocationType: 'RequestResponse',
            Payload: JSON.stringify(payload)
        }));
        if (response.StatusCode !== 200) {
            throw new Error(`AI service returned status ${response.StatusCode}`);
        }
        const result = JSON.parse(new TextDecoder().decode(response.Payload));
        console.log(`AI service raw response:`, JSON.stringify(result));
        if (result.errorMessage) {
            throw new Error(result.errorMessage);
        }
        const parsedBody = JSON.parse(result.body);
        console.log(`AI service parsed body:`, JSON.stringify(parsedBody));
        if (!parsedBody.success || !parsedBody.result?.response) {
            console.error(`AI service response missing expected fields. Body:`, parsedBody);
            throw new Error('Invalid response from AI service');
        }
        const dwarfName = robotToDwarfName[robotId] || robotId;
        return parsedBody.result.response + ` [AI: ${dwarfName}]`;
    }
    catch (error) {
        console.error(`Failed to generate AI response for robot ${robotId}:`, error);
        // Fall back to hardcoded responses
        return generateFallbackResponse(prompt, robotId);
    }
}
function generateFallbackResponse(_prompt, robotId) {
    const personality = robotPersonalities[robotId];
    if (!personality) {
        return 'A mysterious essence beyond description';
    }
    // Use existing hardcoded responses as fallback
    const responses = personality.responses;
    const dwarfName = robotToDwarfName[robotId] || robotId;
    return responses[Math.floor(Math.random() * responses.length)] + ` [Fallback: ${dwarfName}]`;
}
// Notify match-service of robot response completion
async function notifyStateUpdate(matchId, roundNumber, robotId) {
    if (!STATE_UPDATE_QUEUE_URL) {
        console.error('STATE_UPDATE_QUEUE_URL is not set!');
        return;
    }
    const message = {
        type: 'ROBOT_RESPONSE_COMPLETE',
        matchId,
        roundNumber,
        robotId,
        timestamp: new Date().toISOString()
    };
    try {
        await sqsClient.send(new client_sqs_1.SendMessageCommand({
            QueueUrl: STATE_UPDATE_QUEUE_URL,
            MessageBody: JSON.stringify(message)
        }));
        console.log(`Notified match-service of ${robotId} completion for match ${matchId} round ${roundNumber}`);
    }
    catch (error) {
        console.error(`Failed to send state update notification:`, error);
        throw error;
    }
}
const handler = async (event) => {
    console.log('Robot Worker received event:', JSON.stringify(event, null, 2));
    // Process each message
    for (const record of event.Records) {
        try {
            await processRobotResponse(record);
        }
        catch (error) {
            console.error('Failed to process robot response:', error);
            // Throw error to let SQS retry (with DLQ configured)
            throw error;
        }
    }
};
exports.handler = handler;
async function processRobotResponse(record) {
    const message = JSON.parse(record.body);
    const { matchId, roundNumber, prompt, robotId } = message;
    console.log(`Processing robot ${robotId} response for match ${matchId}, round ${roundNumber}`);
    console.log('DynamoDB table:', TABLE_NAME);
    // Get current match state
    try {
        const result = await docClient.send(new lib_dynamodb_1.GetCommand({
            TableName: TABLE_NAME,
            Key: {
                matchId,
                timestamp: 0,
            },
        }));
        console.log('DynamoDB GetCommand result:', JSON.stringify(result, null, 2));
        if (!result.Item) {
            throw new Error(`Match ${matchId} not found`);
        }
        const match = result.Item;
        console.log('Match found, current round:', match.currentRound, 'rounds length:', match.rounds?.length);
        // Find the round
        const roundIndex = match.rounds.findIndex((r) => r.roundNumber === roundNumber);
        if (roundIndex === -1) {
            throw new Error(`Round ${roundNumber} not found in match ${matchId}`);
        }
        // Add staggered delays to avoid Bedrock rate limits
        const robotDelays = {
            'B': 0, // No delay for first robot
            'C': 2000, // 2 second delay for second robot
            'D': 4000 // 4 second delay for third robot
        };
        const delay = robotDelays[robotId] || 0;
        if (delay > 0) {
            console.log(`Waiting ${delay}ms before generating response for robot ${robotId} to avoid rate limits`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
        // Generate robot response
        const response = await generateRobotResponse(prompt, robotId, roundNumber);
        // Update the match with the robot's response
        const updateExpression = `SET rounds[${roundIndex}].responses.#robotId = :response, updatedAt = :updatedAt`;
        console.log(`Updating robot ${robotId} response for match ${matchId}, round ${roundNumber}`);
        console.log(`Update expression: ${updateExpression}`);
        try {
            await docClient.send(new lib_dynamodb_1.UpdateCommand({
                TableName: TABLE_NAME,
                Key: {
                    matchId,
                    timestamp: 0,
                },
                UpdateExpression: updateExpression,
                ExpressionAttributeNames: {
                    '#robotId': robotId,
                },
                ExpressionAttributeValues: {
                    ':response': response,
                    ':updatedAt': new Date().toISOString(),
                },
            }));
            console.log(`Robot ${robotId} response successfully stored for match ${matchId}`);
        }
        catch (error) {
            console.error(`Failed to store robot ${robotId} response:`, error);
            throw error;
        }
        // Notify match-service that this robot has completed its response
        await notifyStateUpdate(matchId, roundNumber, robotId);
        console.log(`Robot ${robotId} response added to match ${matchId}, round ${roundNumber}`);
    }
    catch (error) {
        console.error('Error in processRobotResponse:', error);
        throw error;
    }
}
