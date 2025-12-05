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

// Quick signup schema - email only for QR landing
export const quickSignupSchema = z.object({
  email: z.string().email(),
  termsAccepted: z.boolean().refine(val => val === true, {
    message: "You must accept the Terms of Service and Privacy Policy"
  }),
  marketingConsent: z.boolean().optional().default(false),
});

// Schema for converting quick signup to full account
export const convertAccountSchema = z.object({
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
});

export type RegisterData = z.infer<typeof registerSchema>;
export type LoginData = z.infer<typeof loginSchema>;
export type QuickSignupData = z.infer<typeof quickSignupSchema>;
export type ConvertAccountData = z.infer<typeof convertAccountSchema>;

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

// Quick signup - email only, no password required
export async function quickSignupUser(data: QuickSignupData) {
  const normalizedEmail = data.email.toLowerCase();
  
  // Check if user already exists
  const existingUser = await storage.getUserByEmail(normalizedEmail);
  if (existingUser) {
    // If it's a quick signup account that's still in trial, allow re-login
    if (existingUser.isQuickSignup === 1 && !existingUser.passwordHash) {
      return { user: existingUser, isReturningUser: true };
    }
    // If it's a full account, they need to use regular login
    throw new Error("An account with this email already exists. Please log in with your password.");
  }

  // Prepare consent timestamps
  const now = new Date();
  const termsAcceptedAt = now;
  const marketingConsentAt = data.marketingConsent ? now : undefined;
  const marketingPreferenceStatus = data.marketingConsent ? 'subscribed' : 'unsubscribed';

  // Create quick signup user (no password)
  const user = await storage.createLocalUser({
    email: normalizedEmail,
    firstName: null, // Will be set later when converting
    lastName: null,
    passwordHash: null, // No password for quick signup
    authMethod: "local",
    termsAcceptedAt,
    marketingConsentAt,
    marketingPreferenceStatus,
    isQuickSignup: 1,
  });

  return { user, isReturningUser: false };
}

// Quick login for returning email-only users
export async function quickLoginUser(email: string) {
  const normalizedEmail = email.toLowerCase();
  
  const user = await storage.getUserByEmail(normalizedEmail);
  if (!user) {
    throw new Error("No account found with this email. Please sign up first.");
  }

  // If it's a full account with password, they need regular login
  if (user.passwordHash) {
    throw new Error("This account has a password set. Please use the regular login.");
  }

  // Allow quick login for email-only accounts
  if (user.isQuickSignup === 1) {
    return user;
  }

  throw new Error("Unable to log in. Please try the regular login page.");
}

// Convert quick signup to full account
export async function convertQuickSignup(userId: string, data: ConvertAccountData) {
  const user = await storage.getUser(userId);
  if (!user) {
    throw new Error("User not found");
  }

  if (user.isQuickSignup !== 1) {
    throw new Error("This account is already a full account");
  }

  if (user.passwordHash) {
    throw new Error("Password already set for this account");
  }

  // Hash the new password
  const passwordHash = await bcrypt.hash(data.password, 12);

  // Update the user to a full account
  const updatedUser = await storage.updateUser(userId, {
    firstName: data.firstName,
    lastName: data.lastName,
    passwordHash,
    isQuickSignup: 0,
    quickSignupConvertedAt: new Date(),
  });

  return updatedUser;
}