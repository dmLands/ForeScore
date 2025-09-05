import Stripe from 'stripe';
import { storage } from './storage';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
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
   * Create a subscription with 7-day trial
   */
  async createSubscription(userId: string, planKey: keyof typeof SUBSCRIPTION_PLANS): Promise<{ 
    subscriptionId: string; 
    clientSecret: string | null; 
    status: string;
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
    
    // Create subscription WITHOUT trial first - trial starts after payment confirmation
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{
        price: plan.priceId,
      }],
      payment_behavior: 'default_incomplete', // Require payment method setup
      payment_settings: {
        save_default_payment_method: 'on_subscription', // Save payment method for future use
      },
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        userId,
        planKey,
        trialDays: plan.trialDays.toString(), // Store trial days for later use
      },
    });
    
    // Update user record - subscription will be 'incomplete' until payment confirmed
    await storage.updateUserSubscription(userId, {
      stripeSubscriptionId: subscription.id,
      subscriptionStatus: subscription.status as any, // Will be 'incomplete' until payment confirmed
      trialEndsAt: null, // Trial starts after payment confirmation via webhook
    });
    
    // Get payment intent for setup
    const invoice = subscription.latest_invoice as Stripe.Invoice;
    const paymentIntent = (invoice as any)?.payment_intent as Stripe.PaymentIntent;
    
    return {
      subscriptionId: subscription.id,
      clientSecret: paymentIntent?.client_secret || null,
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
      case 'invoice.payment_succeeded':
        // When first payment succeeds on incomplete subscription, start trial
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription) {
          await this.startTrialAfterPayment(invoice.subscription as string);
        }
        break;
        
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        const subscription = event.data.object as Stripe.Subscription;
        await this.updateSubscriptionStatus(subscription);
        break;
        
      case 'invoice.payment_failed':
        const failedInvoice = event.data.object as Stripe.Invoice;
        if (failedInvoice.subscription) {
          const sub = await stripe.subscriptions.retrieve(failedInvoice.subscription as string);
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
   * Cancel subscription (at end of period)
   */
  async cancelSubscription(userId: string): Promise<void> {
    const user = await storage.getUser(userId);
    if (!user?.stripeSubscriptionId) {
      throw new Error('No active subscription found');
    }
    
    await stripe.subscriptions.update(user.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });
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