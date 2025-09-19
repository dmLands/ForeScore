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
    
    // Create subscription with PROPER TRIAL SETUP to prevent immediate charging
    const subscriptionData: any = {
      customer: customerId,
      items: [{
        price: plan.priceId,
      }],
      // Use trial_period_days instead of trial_end to prevent immediate charging
      trial_period_days: plan.trialDays,
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
    
    // Check subscription status
    if (user.subscriptionStatus === 'active') {
      // For active subscriptions, fetch next renewal date and plan info from Stripe
      let nextRenewalDate: Date | undefined;
      let currentPlan: any = undefined;
      
      if (user.stripeSubscriptionId) {
        try {
          console.log(`Fetching Stripe subscription details for user ${userId}, subscription: ${user.stripeSubscriptionId}`);
          const stripeSubscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
          
          // Cast to any to access Stripe properties properly
          const sub = stripeSubscription as any;
          console.log(`Stripe subscription status: ${sub.status}`);
          console.log(`current_period_end: ${sub.current_period_end}`);
          console.log(`trial_end: ${sub.trial_end}`);
          console.log(`cancel_at_period_end: ${sub.cancel_at_period_end}`);
          
          // First extract current plan information to know the billing interval
          let planInterval = 'month'; // default
          if (stripeSubscription.items?.data?.[0]?.price) {
            const price = stripeSubscription.items.data[0].price;
            const priceId = price.id;
            console.log(`Subscription price ID: ${priceId}`);
            
            // Find matching plan in our SUBSCRIPTION_PLANS
            for (const [planKey, plan] of Object.entries(SUBSCRIPTION_PLANS)) {
              if (plan.priceId === priceId) {
                currentPlan = {
                  name: plan.name,
                  amount: plan.amount,
                  interval: plan.interval,
                  planKey: planKey,
                };
                planInterval = plan.interval;
                console.log(`Found matching plan: ${planKey} - ${plan.name}, interval: ${planInterval}`);
                break;
              }
            }
            
            if (!currentPlan) {
              console.log(`No matching plan found for price ID: ${priceId}`);
            }
          } else {
            console.log('No subscription items or price found in Stripe subscription');
          }
          
          // Now calculate renewal date based on plan interval
          if (sub.status === 'active') {
            if (sub.current_period_end) {
              nextRenewalDate = new Date(sub.current_period_end * 1000);
              console.log(`Next renewal date: ${nextRenewalDate} (from current_period_end)`);
            } else {
              console.log(`WARNING: Active subscription missing current_period_end - calculating from subscription created date using ${planInterval} interval`);
              // Fallback: Calculate next renewal based on subscription creation and interval
              try {
                const subscriptionCreated = new Date(stripeSubscription.created * 1000);
                const currentTime = new Date();
                
                // Calculate next renewal date based on creation date and interval
                let nextBillingDate = new Date(subscriptionCreated);
                
                if (planInterval === 'month') {
                  // Add months until we get to a future date
                  while (nextBillingDate <= currentTime) {
                    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
                  }
                } else if (planInterval === 'year') {
                  // Add years until we get to a future date
                  while (nextBillingDate <= currentTime) {
                    nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
                  }
                }
                
                nextRenewalDate = nextBillingDate;
                console.log(`Calculated next renewal date: ${nextRenewalDate} (based on ${planInterval}ly billing from ${subscriptionCreated})`);
              } catch (error) {
                console.error('Error calculating next renewal date:', error);
              }
            }
          } else if (sub.status === 'trialing' && sub.trial_end) {
            // Only use trial_end for subscriptions still in trial
            nextRenewalDate = new Date(sub.trial_end * 1000);
            console.log(`Trial end date: ${nextRenewalDate} (from trial_end)`);
          } else {
            console.log(`No renewal date found for subscription status: ${sub.status}`);
          }
        } catch (error) {
          console.error('Error fetching subscription details from Stripe:', error);
        }
      }
      
      const result = { 
        hasAccess: true, 
        subscriptionStatus: 'active',
        nextRenewalDate,
        currentPlan
      };
      
      console.log('Returning subscription status:', JSON.stringify(result, null, 2));
      return result;
    }
    
    // Don't allow access for incomplete subscriptions
    if (user.subscriptionStatus === 'incomplete') {
      return { hasAccess: false, reason: 'Payment required' };
    }
    
    // Check if in trial period
    if (user.subscriptionStatus === 'trialing' && user.trialEndsAt) {
      const now = new Date();
      const trialEnd = new Date(user.trialEndsAt);
      
      if (now < trialEnd) {
        return { hasAccess: true, trialEndsAt: trialEnd, subscriptionStatus: 'trialing' };
      } else {
        // Trial expired - check if Stripe subscription has been activated
        try {
          if (user.stripeSubscriptionId) {
            const stripeSubscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
            
            // If Stripe shows subscription is active, update our records and grant access
            if (stripeSubscription.status === 'active') {
              console.log(`Converting user ${userId} from trial to active subscription`);
              await storage.updateUserSubscription(userId, {
                subscriptionStatus: 'active',
                trialEndsAt: undefined, // Clear trial data when converting to paid
              });
              
              // Include next renewal date and plan info
              let nextRenewalDate: Date | undefined;
              let currentPlan: any = undefined;
              
              const sub = stripeSubscription as any;
              if (sub.current_period_end) {
                nextRenewalDate = new Date(sub.current_period_end * 1000);
                console.log(`Trial-to-paid conversion: Next renewal date: ${nextRenewalDate}`);
              } else {
                console.log('WARNING: Trial-to-paid conversion missing current_period_end - trying upcoming invoice fallback');
                // Fallback: get next invoice date when current_period_end is missing
                try {
                  const upcomingInvoice = await (stripe.invoices as any).retrieveUpcoming({
                    customer: stripeSubscription.customer as string,
                    subscription: stripeSubscription.id,
                  });
                  
                  if (upcomingInvoice.next_payment_attempt) {
                    nextRenewalDate = new Date(upcomingInvoice.next_payment_attempt * 1000);
                    console.log(`Trial-to-paid conversion: Next renewal date: ${nextRenewalDate} (from upcoming invoice next_payment_attempt)`);
                  } else if (upcomingInvoice.lines?.data?.[0]?.period?.end) {
                    nextRenewalDate = new Date(upcomingInvoice.lines.data[0].period.end * 1000);
                    console.log(`Trial-to-paid conversion: Next renewal date: ${nextRenewalDate} (from upcoming invoice period end)`);
                  } else {
                    console.log('Trial-to-paid conversion: No renewal date found in upcoming invoice either');
                  }
                } catch (error) {
                  console.error('Trial-to-paid conversion: Error fetching upcoming invoice:', error);
                }
              }
              
              // Extract current plan information
              if (stripeSubscription.items?.data?.[0]?.price) {
                const price = stripeSubscription.items.data[0].price;
                const priceId = price.id;
                
                // Find matching plan in our SUBSCRIPTION_PLANS
                for (const [planKey, plan] of Object.entries(SUBSCRIPTION_PLANS)) {
                  if (plan.priceId === priceId) {
                    currentPlan = {
                      name: plan.name,
                      amount: plan.amount,
                      interval: plan.interval,
                      planKey: planKey,
                    };
                    break;
                  }
                }
              }
              
              const result = { hasAccess: true, subscriptionStatus: 'active', nextRenewalDate, currentPlan };
              console.log('Returning trial-to-paid conversion result:', JSON.stringify(result, null, 2));
              return result;
            }
          }
        } catch (error) {
          console.error('Error checking Stripe subscription status:', error);
        }
        
        // Trial truly expired without payment - gracefully handle
        await storage.updateUserSubscription(userId, {
          subscriptionStatus: 'past_due',
        });
        return { hasAccess: false, reason: 'Trial expired - please update payment' };
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
        // Skip trial adjustment - trials are handled during subscription creation
        // This prevents double-processing that causes immediate charging
        break;
        
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        const subscription = event.data.object as Stripe.Subscription;
        await this.updateSubscriptionStatus(subscription);
        break;
        
      case 'invoice.payment_failed':
        const failedInvoice = event.data.object as Stripe.Invoice;
        if ((failedInvoice as any).subscription && typeof (failedInvoice as any).subscription === 'string') {
          const sub = await stripe.subscriptions.retrieve((failedInvoice as any).subscription);
          await this.updateSubscriptionStatus(sub);
        }
        break;
    }
  }

  // REMOVED: startTrialAfterPayment method was causing immediate charging during trials
  // Trials are now properly handled during initial subscription creation
  
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