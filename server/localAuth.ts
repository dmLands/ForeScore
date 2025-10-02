import bcrypt from "bcryptjs";
import { storage } from "./storage.js";
import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  termsAccepted: z.boolean().refine(val => val === true, {
    message: "You must accept the Terms of Service and Privacy Policy to register"
  }),
  marketingConsent: z.boolean(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type RegisterData = z.infer<typeof registerSchema>;
export type LoginData = z.infer<typeof loginSchema>;

export async function registerUser(data: RegisterData) {
  // Normalize email to lowercase for case-insensitive comparison
  const normalizedEmail = data.email.toLowerCase();
  
  // Check if user already exists
  const existingUser = await storage.getUserByEmail(normalizedEmail);
  if (existingUser) {
    throw new Error("User with this email already exists");
  }

  // Hash password
  const passwordHash = await bcrypt.hash(data.password, 12);

  // Prepare consent timestamps
  const now = new Date();
  const termsAcceptedAt = data.termsAccepted ? now : undefined;
  const marketingConsentAt = data.marketingConsent ? now : undefined;
  const marketingPreferenceStatus = data.marketingConsent ? 'subscribed' : 'unsubscribed';

  // Auto-grant 7-day free trial (no payment required)
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + 7);

  // Create user
  const user = await storage.createLocalUser({
    email: normalizedEmail,
    firstName: data.firstName,
    lastName: data.lastName,
    passwordHash,
    authMethod: "local",
    termsAcceptedAt,
    marketingConsentAt,
    marketingPreferenceStatus,
    manualTrialEndsAt: trialEndsAt,
  });

  return user;
}

export async function authenticateUser(data: LoginData) {
  // Normalize email to lowercase for case-insensitive lookup
  const normalizedEmail = data.email.toLowerCase();
  
  // Find user by email
  const user = await storage.getUserByEmail(normalizedEmail);
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