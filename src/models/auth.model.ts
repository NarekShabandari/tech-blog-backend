import bcrypt from "bcryptjs";
import { findUserByEmail, createUser } from "../db/queries/users.js";
import { LoginInput, RegisterInput, User } from "../types/index.js";

const httpError = (status: number, message: string) =>
  Object.assign(new Error(message), { status });

export const registerUser = async ({
  email,
  username,
  password,
}: RegisterInput): Promise<User> => {
  const existing = await findUserByEmail(email);

  if (existing) throw httpError(409, "Email already taken");

  const hashedPassword = await bcrypt.hash(password, 12);

  try {
    return await createUser({ email, username, hashedPassword });
  } catch (error) {
    // unique_violation — e.g. the username is already taken
    if ((error as { code?: string }).code === "23505") {
      throw httpError(409, "Email or username already taken");
    }
    throw error;
  }
};

export const loginUser = async ({
  email,
  password,
}: LoginInput): Promise<User> => {
  const user = await findUserByEmail(email);
  if (!user) throw httpError(401, "Invalid credentials");

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw httpError(401, "Invalid credentials");

  return {
    id: user.id,
    email: user.email,
    username: user.username,
  };
};
