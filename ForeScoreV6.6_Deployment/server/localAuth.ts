import bcrypt from "bcryptjs";
import { storage } from "./storage.js";
import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type RegisterData = z.infer<typeof registerSchema>;
export type LoginData = z.infer<typeof loginSchema>;

export async function registerUser(data: RegisterData) {
  // Check if user already exists
  const existingUser = await storage.getUserByEmail(data.email);
  if (existingUser) {
    throw new Error("User with this email already exists");
  }

  // Hash password
  const passwordHash = await bcrypt.hash(data.password, 12);

  // Create user
  const user = await storage.createLocalUser({
    email: data.email,
    firstName: data.firstName,
    lastName: data.lastName,
    passwordHash,
    authMethod: "local",
  });

  return user;
}

export async function authenticateUser(data: LoginData) {
  // Find user by email
  const user = await storage.getUserByEmail(data.email);
  if (!user) {
    throw new Error("Invalid email or password");
  }

  // Check if user has local authentication
  if (user.authMethod !== "local" || !user.passwordHash) {
    throw new Error("This account uses a different sign-in method");
  }

  // Verify password
  const isValidPassword = await bcrypt.compare(data.password, user.passwordHash);
  if (!isValidPassword) {
    throw new Error("Invalid email or password");
  }

  return user;
}