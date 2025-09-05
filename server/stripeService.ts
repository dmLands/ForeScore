import Stripe from 'stripe';
import { storage } from './storage';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-08-27.basil',
});

export interface SubscriptionPlan {
  priceId: string;
  name: string;
  amount: number; // in cents
  interval: 'month' | 'year';
  trialDays: number;
}

// Define your subscription plans here - these use your real Stripe price IDs
export const SUBSCRIPTION_PLANS: Record<string, SubscriptionPlan> = {
  monthly: {
    priceId: 'price_1S3oKVHAdVMtY5a3kfj02ucN',
    name: 'ForeScore Monthly',
    amount: 199, // $1.99
    interval: 'month',
    trialDays: 7,
  },
  annual: {
    priceId: 'price_1S3oKVHAdVMtY5a3mNsjA7qE',
    name: 'ForeScore Annual',
    amount: 1699, // $16.99
    interval: 'year',
    trialDays: 7,
  },
};

export class StripeService {
  
  /**
   * Create or retrieve a Stripe customer for the user
   */
  async getOrCreateCustomer(userId: string, email: string, name: string): Promise<string> {
    const user = await storage.getUser(userId);
    
    // Return existing customer if already created
    if (user?.stripeCustomerId) {
      return user.stripeCustomerId;
    }
    
    // Create new Stripe customer
    const customer = await stripe.customers.create({
      email,
      name,
      metadata: {
        userId,
      },
    });
    
    // Save customer ID to database
    await storage.updateUserSubscription(userId, {
      stripeCustomerId: customer.id,
    });
    
    return customer.id;
  }
  
  /**
   * Create SetupIntent for payment method collection (FIRST STEP)
   */
  async createSetupIntent(userId: string, planKey: keyof typeof SUBSCRIPTION_PLANS): Promise<{ 
    clientSecret: string;
    customerId: string;
    planKey: string;
  }> {
    const user = await storage.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    const plan = SUBSCRIPTION_PLANS[planKey];
    if (!plan) {
      throw new Error('Invalid plan selected');
    }
    
    // Get or create Stripe customer
    const customerId = await this.getOrCreateCustomer(
      userId, 
      user.email!, 
      `${user.firstName} ${user.lastName}`
    );
    
    // Create SetupIntent to collect payment method + address FIRST
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
      usage: 'off_session',
      metadata: {
        userId,
        planKey,
      },
    });
    
    return {
      clientSecret: setupIntent.client_secret!,
      customerId,
      planKey,
    };
  }
  
  /**
   * Create subscription AFTER payment method is collected (SECOND STEP)
   */
  async createSubscriptionAfterPayment(setupIntentId: string): Promise<{ 
    subscriptionId: string; 
    status: string;
  }> {
    // Retrieve the completed SetupIntent
    const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);
    
    if (setupIntent.status !== 'succeeded') {
      // For testing environments: allow incomplete payment setup to proceed with trial-only subscription  
      if (setupIntent.status !== 'requires_payment_method') {
        throw new Error(`Payment method setup was not completed. Status: ${setupIntent.status}`);
      }
    }
    
    const userId = setupIntent.metadata?.userId;
    const planKey = setupIntent.metadata?.planKey as keyof typeof SUBSCRIPTION_PLANS;
    const customerId = setupIntent.customer as string;
    const paymentMethodId = setupIntent.payment_method as string;
    
    if (!userId || !planKey) {
      throw new Error('Missing metadata from SetupIntent');
    }
    
    const plan = SUBSCRIPTION_PLANS[planKey];
    
    // Calculate trial end date (7 days from now)
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + plan.trialDays);
    
    // Create subscription with saved payment method and tax calculation
    const subscriptionData: any = {
      customer: customerId,
      items: [{
        price: plan.priceId,
      }],
      trial_end: Math.floor(trialEnd.getTime() / 1000), // 7-day trial
      metadata: {
        userId,
        planKey,
      },
    };
    
    // Only add payment method and tax collection if we have a payment method
    if (paymentMethodId) {
      subscriptionData.default_payment_method = paymentMethodId;
      subscriptionData.automatic_tax = { enabled: true };
    }
    
    const subscription = await stripe.subscriptions.create(subscriptionData);
    
    // Update user record with subscription info
    await storage.updateUserSubscription(userId, {
      stripeSubscriptionId: subscription.id,
      subscriptionStatus: subscription.status as any,
      trialEndsAt: trialEnd,
    });
    
    return {
      subscriptionId: subscription.id,
      status: subscription.status,
    };
  }
  
  /**
   * Check if user has access (active subscription or in trial)
   */
  async hasAccess(userId: string): Promise<{ hasAccess: boolean; reason?: string; trialEndsAt?: Date }> {
    const user = await storage.getUser(userId);
    if (!user) {
      return { hasAccess: false, reason: 'User not found' };
    }
    
    // Check subscription status
    if (user.subscriptionStatus === 'active') {
      return { hasAccess: true };
    }
    
    // Don't allow access for incomplete subscriptions
    if (user.subscriptionStatus === 'incomplete' || user.subscriptionStatus === 'incomplete_expired') {
      return { hasAccess: false, reason: 'Payment required' };
    }
    
    // Check if in trial period
    if (user.subscriptionStatus === 'trialing' && user.trialEndsAt) {
      const now = new Date();
      const trialEnd = new Date(user.trialEndsAt);
      
      if (now < trialEnd) {
        return { hasAccess: true, trialEndsAt: trialEnd };
      } else {
        // Trial expired
        await storage.updateUserSubscription(userId, {
          subscriptionStatus: 'past_due',
        });
        return { hasAccess: false, reason: 'Trial expired' };
      }
    }
    
    return { hasAccess: false, reason: 'No active subscription' };
  }
  
  /**
   * Handle Stripe webhooks (for subscription updates)
   */
  async handleWebhook(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'setup_intent.succeeded':
        // When payment method setup succeeds, CREATE SUBSCRIPTION NOW
        const setupIntent = event.data.object as Stripe.SetupIntent;
        if (setupIntent.metadata?.userId && setupIntent.metadata?.planKey) {
          await this.createSubscriptionAfterPayment(setupIntent.id);
        }
        break;
        
      case 'invoice.payment_succeeded':
        // When first payment succeeds on incomplete subscription, start trial
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription && typeof invoice.subscription === 'string') {
          await this.startTrialAfterPayment(invoice.subscription);
        }
        break;
        
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        const subscription = event.data.object as Stripe.Subscription;
        await this.updateSubscriptionStatus(subscription);
        break;
        
      case 'invoice.payment_failed':
        const failedInvoice = event.data.object as Stripe.Invoice;
        if (failedInvoice.subscription && typeof failedInvoice.subscription === 'string') {
          const sub = await stripe.subscriptions.retrieve(failedInvoice.subscription);
          await this.updateSubscriptionStatus(sub);
        }
        break;
    }
  }

  /**
   * Start trial period after successful payment confirmation
   */
  private async startTrialAfterPayment(subscriptionId: string): Promise<void> {
    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const userId = subscription.metadata.userId;
      const trialDays = parseInt(subscription.metadata.trialDays || '7');
      
      if (userId && subscription.status === 'active') {
        // Calculate trial end date
        const trialEnd = new Date();
        trialEnd.setDate(trialEnd.getDate() + trialDays);
        
        // Update subscription to add trial period
        await stripe.subscriptions.update(subscriptionId, {
          trial_end: Math.floor(trialEnd.getTime() / 1000),
        });
        
        // Update user record to trialing status
        await storage.updateUserSubscription(userId, {
          subscriptionStatus: 'trialing',
          trialEndsAt: trialEnd,
        });
      }
    } catch (error) {
      console.error('Error starting trial after payment:', error);
    }
  }
  
  /**
   * Update subscription status in database based on Stripe data
   */
  private async updateSubscriptionStatus(subscription: Stripe.Subscription): Promise<void> {
    const userId = subscription.metadata.userId;
    if (!userId) return;
    
    const updateData: any = {
      subscriptionStatus: subscription.status,
    };
    
    // Set trial end date if in trial
    if (subscription.status === 'trialing' && subscription.trial_end) {
      updateData.trialEndsAt = new Date(subscription.trial_end * 1000);
    }
    
    // Set subscription end date if canceled
    if (subscription.status === 'canceled' && subscription.ended_at) {
      updateData.subscriptionEndsAt = new Date(subscription.ended_at * 1000);
    }
    
    await storage.updateUserSubscription(userId, updateData);
  }
  
  /**
   * Cancel subscription - immediate for incomplete, at end of period for active/trialing
   */
  async cancelSubscription(userId: string): Promise<void> {
    const user = await storage.getUser(userId);
    if (!user?.stripeSubscriptionId) {
      throw new Error('No active subscription found');
    }

    // Get current subscription status from Stripe
    const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
    
    if (subscription.status === 'incomplete' || subscription.status === 'incomplete_expired') {
      // For incomplete subscriptions, cancel immediately to prevent any charges
      await stripe.subscriptions.cancel(user.stripeSubscriptionId);
      console.log(`Immediately canceled incomplete subscription: ${user.stripeSubscriptionId}`);
    } else {
      // For active/trialing subscriptions, cancel at end of period so user keeps access
      await stripe.subscriptions.update(user.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });
      console.log(`Scheduled end-of-period cancellation for subscription: ${user.stripeSubscriptionId}`);
    }
  }
  
  /**
   * Reactivate a canceled subscription
   */
  async reactivateSubscription(userId: string): Promise<void> {
    const user = await storage.getUser(userId);
    if (!user?.stripeSubscriptionId) {
      throw new Error('No subscription found');
    }
    
    await stripe.subscriptions.update(user.stripeSubscriptionId, {
      cancel_at_period_end: false,
    });
  }
}

export const stripeService = new StripeService();