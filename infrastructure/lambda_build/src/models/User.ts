import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcrypt";
import { documentClient, USER_TABLE } from "../config/dynamodb";
import {
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";

export interface IUser {
  id: string;
  email: string;
  password: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

// Utility function to hash a password
export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
};

// Utility function to compare password with hashed version
export const comparePassword = async (
  plainPassword: string,
  hashedPassword: string
): Promise<boolean> => {
  return bcrypt.compare(plainPassword, hashedPassword);
};

// Create a new user
export async function createUser(
  userData: Omit<IUser, "id" | "createdAt" | "updatedAt">
): Promise<IUser> {
  const hashedPassword = await hashPassword(userData.password);
  const newUser: IUser = {
    id: uuidv4(),
    ...userData,
    password: hashedPassword,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await documentClient.send(
    new PutCommand({
      TableName: USER_TABLE,
      Item: {
        pk: `USER#${newUser.id}`,
        sk: `PROFILE#${newUser.id}`,
        ...newUser,
      },
    })
  );

  return newUser;
}

// Find a user by email
export async function findByEmail(email: string): Promise<IUser | null> {
  const result = await documentClient.send(
    new QueryCommand({
      TableName: USER_TABLE,
      IndexName: "EmailIndex",
      KeyConditionExpression: "email = :email",
      ExpressionAttributeValues: {
        ":email": email,
      },
      Limit: 1,
    })
  );

  if (result.Items && result.Items.length > 0) {
    return result.Items[0] as IUser;
  }

  return null;
}

// Find a user by ID
export async function findById(id: string): Promise<IUser | null> {
  const result = await documentClient.send(
    new GetCommand({
      TableName: USER_TABLE,
      Key: {
        pk: `USER#${id}`,
        sk: `PROFILE#${id}`,
      },
    })
  );

  if (result.Item) {
    return result.Item as IUser;
  }

  return null;
}

// Update a user
export async function updateUser(
  id: string,
  updates: Partial<IUser>
): Promise<IUser> {
  const updateFields: any = {
    ...updates,
    updatedAt: new Date(),
  };

  if (updates.password) {
    updateFields.password = await hashPassword(updates.password);
  }

  const updateExpressions: string[] = [];
  const expressionAttributeNames: Record<string, string> = {};
  const expressionAttributeValues: Record<string, any> = {};

  Object.entries(updateFields).forEach(([key, value]) => {
    if (key !== "id" && key !== "pk" && key !== "sk") {
      updateExpressions.push(`#${key} = :${key}`);
      expressionAttributeNames[`#${key}`] = key;
      expressionAttributeValues[`:${key}`] = value;
    }
  });

  const result = await documentClient.send(
    new UpdateCommand({
      TableName: USER_TABLE,
      Key: {
        pk: `USER#${id}`,
        sk: `PROFILE#${id}`,
      },
      UpdateExpression: `SET ${updateExpressions.join(", ")}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: "ALL_NEW",
    })
  );

  return result.Attributes as IUser;
}

// Delete a user
export async function deleteUser(id: string): Promise<void> {
  await documentClient.send(
    new DeleteCommand({
      TableName: USER_TABLE,
      Key: {
        pk: `USER#${id}`,
        sk: `PROFILE#${id}`,
      },
    })
  );
}
