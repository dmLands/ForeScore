import Stripe from 'stripe';
import { storage } from './storage';
import { appleIapService } from './appleIapService';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

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
    
    // CRITICAL: Check for existing active subscriptions to prevent duplicates
    const existingSubscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 100,
    });
    
    const activeOrTrialingSubs = existingSubscriptions.data.filter(
      sub => sub.status === 'active' || sub.status === 'trialing'
    );
    
    if (activeOrTrialingSubs.length > 0) {
      console.log(`⚠️  Customer ${customerId} already has ${activeOrTrialingSubs.length} active subscription(s)`);
      throw new Error(`Customer already has an active subscription. Please cancel existing subscription first.`);
    }
    
    const plan = SUBSCRIPTION_PLANS[planKey];
    
    // Create subscription - charge immediately (no trial for paid users)
    const subscriptionData: any = {
      customer: customerId,
      items: [{
        price: plan.priceId,
      }],
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
    
    // CRITICAL FIX: Write to canonical stripe_subscriptions table
    const sub = subscription as any; // Cast to access all Stripe fields
    await storage.upsertStripeSubscription({
      userId,
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: customerId,
      stripePriceId: plan.priceId,
      status: subscription.status as any,
      currentPeriodStart: sub.current_period_start ? new Date(sub.current_period_start * 1000) : null,
      currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000) : null,
      trialStart: subscription.trial_start ? new Date(subscription.trial_start * 1000) : null,
      trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
      cancelAt: subscription.cancel_at ? new Date(subscription.cancel_at * 1000) : null,
      cancelAtPeriodEnd: subscription.cancel_at_period_end ? 1 : 0,
      latestInvoiceId: subscription.latest_invoice as string | null,
      collectionMethod: subscription.collection_method as any,
    });
    
    // Also update legacy user fields for backward compatibility
    await storage.updateUserSubscription(userId, {
      stripeSubscriptionId: subscription.id,
      subscriptionStatus: subscription.status as any,
    });
    
    console.log(`✅ Created subscription ${subscription.id} for user ${userId} - canonical table updated`);
    
    return {
      subscriptionId: subscription.id,
      status: subscription.status,
    };
  }
  
  /**
   * Check if user has access using canonical Stripe subscription data (no API calls)
   */
  async hasAccess(userId: string): Promise<{ 
    hasAccess: boolean; 
    reason?: string; 
    trialEndsAt?: Date; 
    nextRenewalDate?: Date; 
    subscriptionStatus?: string;
    currentPlan?: {
      name: string;
      amount: number;
      interval: string;
      planKey: string;
    };
  }> {
    const user = await storage.getUser(userId);
    if (!user) {
      return { hasAccess: false, reason: 'User not found' };
    }
    
    // FIRST PRIORITY: Check for active manual trial (admin-granted)
    if (user.manualTrialEndsAt) {
      const now = new Date();
      const manualTrialEnd = new Date(user.manualTrialEndsAt);
      if (now < manualTrialEnd) {
        console.log(`✅ User ${userId} has access: Manual trial (ends ${manualTrialEnd}, granted by admin)`);
        return { 
          hasAccess: true, 
          trialEndsAt: manualTrialEnd, 
          subscriptionStatus: 'manual_trial'
        };
      } else {
        console.log(`❌ User ${userId} manual trial expired (ended ${manualTrialEnd})`);
      }
    }
    
    // SECOND PRIORITY: Check for active auto-trial (self-serve registration)
    if (user.autoTrialStatus === 'active' && user.autoTrialEndsAt) {
      const now = new Date();
      const autoTrialEnd = new Date(user.autoTrialEndsAt);
      if (now < autoTrialEnd) {
        console.log(`✅ User ${userId} has access: Auto-trial (ends ${autoTrialEnd}, self-serve)`);
        return { 
          hasAccess: true, 
          trialEndsAt: autoTrialEnd, 
          subscriptionStatus: 'auto_trial'
        };
      } else {
        console.log(`❌ User ${userId} auto-trial expired (ended ${autoTrialEnd})`);
        // Update status to expired
        await storage.checkAutoTrialStatus(userId); // This will update the status
      }
    }
    
    // THIRD PRIORITY: Check for active Apple IAP subscription
    try {
      const appleAccess = await appleIapService.hasAccess(userId);
      if (appleAccess.hasAccess) {
        console.log(`✅ User ${userId} has access: Apple IAP (product: ${appleAccess.productId}, status: ${appleAccess.subscriptionStatus})`);
        return {
          hasAccess: true,
          subscriptionStatus: `apple_${appleAccess.subscriptionStatus}`,
          nextRenewalDate: appleAccess.expiresDate,
          currentPlan: appleAccess.planKey ? {
            name: `ForeScore ${appleAccess.planKey === 'annual' ? 'Annual' : 'Monthly'} (Apple)`,
            amount: appleAccess.planKey === 'annual' ? 1799 : 199,
            interval: appleAccess.planKey === 'annual' ? 'year' : 'month',
            planKey: `apple_${appleAccess.planKey}`,
          } : undefined,
        };
      }
    } catch (appleError) {
      console.error(`⚠️ Apple IAP check failed for user ${userId}:`, appleError);
    }

    // FOURTH PRIORITY: Get canonical subscription data from our database (PAID subscriptions take precedence)
    const subscription = await storage.getStripeSubscription(userId);
    
    if (!subscription) {
      // No subscription found - check legacy user fields for backward compatibility
      if (user.subscriptionStatus === 'trialing' && user.trialEndsAt) {
        const now = new Date();
        const trialEnd = new Date(user.trialEndsAt);
        if (now < trialEnd) {
          console.log(`✅ User ${userId} has access: Legacy trial (ends ${trialEnd})`);
          return { hasAccess: true, trialEndsAt: trialEnd, subscriptionStatus: 'trialing' };
        }
      }
      
      // No paid subscription - check if user is eligible for free trial as fallback
      if (user.autoTrialStatus === 'eligible') {
        console.log(`ℹ️ User ${userId} is eligible for auto-trial (not activated)`);
        return {
          hasAccess: false,
          subscriptionStatus: 'trial_eligible',
          reason: 'Trial eligible - needs activation'
        };
      }
      
      console.log(`❌ User ${userId} has no subscription record`);
      return { hasAccess: false, reason: 'No subscription' };
    }
    
    console.log(`📋 Subscription status for user ${userId}: ${subscription.status}`);
    
    // Extract plan information
    let currentPlan: any = undefined;
    if (subscription.stripePriceId) {
      for (const [planKey, plan] of Object.entries(SUBSCRIPTION_PLANS)) {
        if (plan.priceId === subscription.stripePriceId) {
          currentPlan = {
            name: plan.name,
            amount: plan.amount,
            interval: plan.interval,
            planKey: planKey,
          };
          console.log(`📦 Found plan: ${plan.name} (${planKey})`);
          break;
        }
      }
    }
    
    // Check subscription status
    if (subscription.status === 'active') {
      const nextRenewalDate = subscription.currentPeriodEnd || undefined;
      console.log(`✅ User ${userId} has active subscription (next renewal: ${nextRenewalDate})`);
      
      return { 
        hasAccess: true, 
        subscriptionStatus: 'active',
        nextRenewalDate,
        currentPlan
      };
    }
    
    if (subscription.status === 'trialing') {
      const trialEnd = subscription.trialEnd;
      if (trialEnd && new Date() < trialEnd) {
        console.log(`✅ User ${userId} is in trial (ends ${trialEnd})`);
        return { 
          hasAccess: true, 
          trialEndsAt: trialEnd, 
          subscriptionStatus: 'trialing',
          currentPlan
        };
      } else {
        // Trial has expired - check if subscription is still valid (recently converted)
        // Allow grace period for Stripe to update status after successful payment
        const now = new Date();
        const gracePeriodHours = 24; // 24 hour grace period after trial end
        const gracePeriodEnd = new Date(trialEnd!.getTime() + (gracePeriodHours * 60 * 60 * 1000));
        
        if (now < gracePeriodEnd) {
          console.log(`✅ User ${userId} trial expired but within grace period - likely paid conversion`);
          return { 
            hasAccess: true, 
            subscriptionStatus: 'trialing', // Will show as trialing until webhook updates
            currentPlan
          };
        } else {
          console.log(`❌ User ${userId} trial has expired beyond grace period`);
          return { hasAccess: false, reason: 'Trial expired' };
        }
      }
    }
    
    // Handle other subscription statuses
    if (subscription.status === 'incomplete') {
      console.log(`❌ User ${userId} has incomplete subscription - payment required`);
      return { hasAccess: false, reason: 'Payment required' };
    }
    
    if (subscription.status === 'canceled') {
      console.log(`❌ User ${userId} subscription is canceled`);
      return { hasAccess: false, reason: 'Subscription canceled' };
    }
    
    if (subscription.status === 'past_due') {
      console.log(`❌ User ${userId} subscription is past due`);
      return { hasAccess: false, reason: 'Payment failed' };
    }
    
    console.log(`❌ User ${userId} subscription status '${subscription.status}' - no access`);
    return { hasAccess: false, reason: 'No active subscription' };
  }
  
  /**
   * Handle Stripe webhooks (for subscription updates)
   */
  async handleWebhook(event: Stripe.Event): Promise<void> {
    console.log(`🎣 Processing webhook: ${event.type}`);
    
    switch (event.type) {
      case 'setup_intent.succeeded':
        // When payment method setup succeeds, CREATE SUBSCRIPTION NOW
        const setupIntent = event.data.object as Stripe.SetupIntent;
        console.log(`💳 Setup Intent succeeded: ${setupIntent.id}`);
        if (setupIntent.metadata?.userId && setupIntent.metadata?.planKey) {
          console.log(`Creating subscription for user: ${setupIntent.metadata.userId}, plan: ${setupIntent.metadata.planKey}`);
          await this.createSubscriptionAfterPayment(setupIntent.id);
        } else {
          console.warn('⚠️  Setup Intent missing userId or planKey in metadata');
        }
        break;
        
      case 'invoice.payment_succeeded':
        // Handle successful payment, especially first payment after trial
        const successfulInvoice = event.data.object as Stripe.Invoice;
        const invoiceSubscriptionId = (successfulInvoice as any).subscription;
        if (invoiceSubscriptionId && typeof invoiceSubscriptionId === 'string') {
          console.log(`💰 Invoice payment succeeded for subscription: ${invoiceSubscriptionId}`);
          const sub = await stripe.subscriptions.retrieve(invoiceSubscriptionId);
          console.log(`Subscription status: ${sub.status}, Customer: ${sub.customer}`);
          await this.updateSubscriptionStatus(sub);
          
          // If this was the first invoice after trial (billing_reason === 'subscription_cycle')
          // ensure user has active access even if status is still 'trialing'
          if ((successfulInvoice as any).billing_reason === 'subscription_cycle') {
            console.log(`🎉 First payment after trial completed - user should now have active subscription`);
          }
        }
        break;
        
      case 'customer.subscription.updated':
        const updatedSubscription = event.data.object as Stripe.Subscription;
        console.log(`🔄 Subscription updated: ${updatedSubscription.id}, new status: ${updatedSubscription.status}`);
        await this.updateSubscriptionStatus(updatedSubscription);
        break;
        
      case 'customer.subscription.deleted':
        const deletedSubscription = event.data.object as Stripe.Subscription;
        console.log(`🗑️  Subscription deleted: ${deletedSubscription.id}`);
        await this.updateSubscriptionStatus(deletedSubscription);
        break;
        
      case 'invoice.payment_failed':
        const failedInvoice = event.data.object as Stripe.Invoice;
        console.log(`❌ Invoice payment failed: ${failedInvoice.id}`);
        if ((failedInvoice as any).subscription && typeof (failedInvoice as any).subscription === 'string') {
          const sub = await stripe.subscriptions.retrieve((failedInvoice as any).subscription);
          console.log(`Updating subscription ${sub.id} status after payment failure`);
          await this.updateSubscriptionStatus(sub);
        }
        break;
        
      default:
        console.log(`ℹ️  Unhandled webhook event type: ${event.type}`);
    }
  }

  // REMOVED: startTrialAfterPayment method was causing immediate charging during trials
  // Trials are now properly handled during initial subscription creation
  
  /**
   * Update subscription status in database using canonical Stripe schema
   */
  private async updateSubscriptionStatus(subscription: Stripe.Subscription): Promise<void> {
    const userId = subscription.metadata.userId;
    if (!userId) return;
    
    console.log(`Webhook: Updating subscription ${subscription.id} for user ${userId}`);
    console.log(`Status: ${subscription.status}, current_period_end: ${(subscription as any).current_period_end}, trial_end: ${(subscription as any).trial_end}`);
    
    // Extract canonical Stripe subscription data
    const sub = subscription as any; // Cast to access all Stripe fields
    const stripeSubscriptionData = {
      userId: userId,
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: subscription.customer as string,
      stripePriceId: subscription.items.data[0]?.price.id || '',
      status: subscription.status as 'trialing' | 'active' | 'canceled' | 'incomplete' | 'past_due' | 'unpaid' | 'paused',
      currentPeriodStart: sub.current_period_start ? new Date(sub.current_period_start * 1000) : null,
      currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000) : null,
      trialStart: subscription.trial_start ? new Date(subscription.trial_start * 1000) : null,
      trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
      cancelAt: subscription.cancel_at ? new Date(subscription.cancel_at * 1000) : null,
      cancelAtPeriodEnd: subscription.cancel_at_period_end ? 1 : 0,
      latestInvoiceId: subscription.latest_invoice as string || null,
      collectionMethod: subscription.collection_method as 'charge_automatically' | 'send_invoice',
    };
    
    try {
      // Upsert into the canonical stripeSubscriptions table
      await storage.upsertStripeSubscription(stripeSubscriptionData);
      console.log(`✅ Webhook: Successfully synced subscription data to canonical table`);
      
      // Also update legacy user fields for backward compatibility (temporary)
      const legacyUpdateData: any = {
        stripeCustomerId: subscription.customer as string,
        stripeSubscriptionId: subscription.id,
        subscriptionStatus: subscription.status,
      };
      
      // Set trial end date if in trial
      if (subscription.status === 'trialing' && subscription.trial_end) {
        legacyUpdateData.trialEndsAt = new Date(subscription.trial_end * 1000);
      }
      
      // Set subscription end date if canceled
      if (subscription.status === 'canceled' && subscription.ended_at) {
        legacyUpdateData.subscriptionEndsAt = new Date(subscription.ended_at * 1000);
      }
      
      await storage.updateUserSubscription(userId, legacyUpdateData);
      console.log(`✅ Webhook: Updated legacy user subscription fields for backward compatibility`);
      
    } catch (error) {
      console.error(`❌ Webhook: Failed to update subscription data:`, error);
      throw error;
    }
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

  /**
   * Sync existing subscription from Stripe to canonical database structure
   */
  async syncSubscriptionFromStripe(userId: string): Promise<void> {
    console.log(`🔄 Syncing subscription data for user: ${userId}`);
    
    const user = await storage.getUser(userId);
    if (!user?.stripeSubscriptionId) {
      console.log(`❌ No Stripe subscription ID found for user: ${userId}`);
      return;
    }

    try {
      // Fetch current subscription from Stripe
      const stripeSubscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
      console.log(`✅ Retrieved Stripe subscription: ${stripeSubscription.id}, status: ${stripeSubscription.status}`);

      // Cast subscription to access all fields
      const sub = stripeSubscription as any;
      
      // Extract canonical fields
      const subscriptionData: any = {
        userId,
        stripeSubscriptionId: stripeSubscription.id,
        stripeCustomerId: stripeSubscription.customer as string,
        status: stripeSubscription.status,
        currentPeriodStart: sub.current_period_start ? 
          new Date(sub.current_period_start * 1000) : null,
        currentPeriodEnd: sub.current_period_end ? 
          new Date(sub.current_period_end * 1000) : null,
        trialStart: stripeSubscription.trial_start ? 
          new Date(stripeSubscription.trial_start * 1000) : null,
        trialEnd: stripeSubscription.trial_end ? 
          new Date(stripeSubscription.trial_end * 1000) : null,
        cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end ? 1 : 0,
        cancelAt: stripeSubscription.cancel_at ? 
          new Date(stripeSubscription.cancel_at * 1000) : null,
      };

      // Extract price ID from subscription items
      if (stripeSubscription.items?.data?.[0]?.price?.id) {
        subscriptionData.stripePriceId = stripeSubscription.items.data[0].price.id;
        console.log(`📦 Found price ID: ${subscriptionData.stripePriceId}`);
      }

      // Store in canonical database structure
      await storage.upsertStripeSubscription(subscriptionData);
      
      console.log(`✅ Successfully synced subscription data for user ${userId}`);
      if (subscriptionData.currentPeriodEnd) {
        console.log(`📅 Next renewal date: ${subscriptionData.currentPeriodEnd}`);
      }
      if (subscriptionData.trialEnd) {
        console.log(`🎯 Trial ends: ${subscriptionData.trialEnd}`);
      }
    } catch (error) {
      console.error(`❌ Error syncing subscription for user ${userId}:`, error);
      throw error;
    }
  }
}

export const stripeService = new StripeService();