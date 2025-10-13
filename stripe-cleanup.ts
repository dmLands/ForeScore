import Stripe from 'stripe';
import { db } from './server/db';
import { users } from './shared/schema';
import { eq } from 'drizzle-orm';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

async function cleanupStripeSubscriptions() {
  console.log('\n🧹 COMPREHENSIVE STRIPE CLEANUP STARTING...\n');
  
  // STEP 1: Cancel orphaned subscriptions for daniel@danonano.com
  console.log('=== STEP 1: Fix daniel@danonano.com ===');
  const danielCustomerId = 'cus_T04bsjR7P2eAPp';
  const danielKeepSubId = 'sub_1S7NGrHAdVMtY5a3fpCMkNm5'; // The one in the database
  
  const danielSubs = await stripe.subscriptions.list({
    customer: danielCustomerId,
    limit: 100,
  });
  
  for (const sub of danielSubs.data) {
    if (sub.id !== danielKeepSubId && sub.status !== 'canceled') {
      console.log(`❌ Canceling orphaned subscription: ${sub.id} (created: ${new Date(sub.created * 1000).toISOString()})`);
      await stripe.subscriptions.cancel(sub.id);
      console.log(`✅ Canceled: ${sub.id}`);
    }
  }
  
  // STEP 2: Find test4@test.com and cancel subscriptions
  console.log('\n=== STEP 2: Check test4@test.com ===');
  const [test4User] = await db.select().from(users).where(eq(users.email, 'test4@test.com'));
  
  if (test4User) {
    console.log(`❌ PROBLEM: test4@test.com STILL EXISTS in database!`);
    console.log(`   User ID: ${test4User.id}`);
    console.log(`   Stripe Customer: ${test4User.stripeCustomerId}`);
    
    if (test4User.stripeCustomerId) {
      const test4Subs = await stripe.subscriptions.list({
        customer: test4User.stripeCustomerId,
        limit: 100,
      });
      
      for (const sub of test4Subs.data) {
        if (sub.status !== 'canceled') {
          console.log(`   ❌ Canceling subscription: ${sub.id}`);
          await stripe.subscriptions.cancel(sub.id);
          console.log(`   ✅ Canceled: ${sub.id}`);
        }
      }
    }
  } else {
    console.log('✅ test4@test.com NOT in database - searching Stripe for orphaned subscriptions...');
    
    // Search Stripe for customer with this email
    const customers = await stripe.customers.list({
      email: 'test4@test.com',
      limit: 100,
    });
    
    if (customers.data.length > 0) {
      console.log(`❌ FOUND ${customers.data.length} Stripe customer(s) for test4@test.com:`);
      
      for (const customer of customers.data) {
        console.log(`\n   Customer: ${customer.id}`);
        const subs = await stripe.subscriptions.list({
          customer: customer.id,
          limit: 100,
        });
        
        console.log(`   Has ${subs.data.length} subscription(s):`);
        for (const sub of subs.data) {
          if (sub.status !== 'canceled') {
            console.log(`   ❌ Canceling subscription: ${sub.id} (status: ${sub.status})`);
            await stripe.subscriptions.cancel(sub.id);
            console.log(`   ✅ Canceled: ${sub.id}`);
          } else {
            console.log(`   ✓ Already canceled: ${sub.id}`);
          }
        }
      }
    } else {
      console.log('✅ No Stripe customers found for test4@test.com');
    }
  }
  
  // STEP 3: Find ALL users with multiple subscriptions
  console.log('\n=== STEP 3: Find users with multiple subscriptions ===');
  const allUsers = await db.select().from(users);
  const usersWithMultipleSubs: any[] = [];
  
  for (const user of allUsers) {
    if (user.stripeCustomerId) {
      const subs = await stripe.subscriptions.list({
        customer: user.stripeCustomerId,
        limit: 100,
      });
      
      const activeSubs = subs.data.filter(s => s.status !== 'canceled');
      if (activeSubs.length > 1) {
        console.log(`⚠️  ${user.email} has ${activeSubs.length} active subscriptions:`);
        activeSubs.forEach(sub => {
          console.log(`   - ${sub.id} (status: ${sub.status}, created: ${new Date(sub.created * 1000).toISOString()})`);
        });
        
        usersWithMultipleSubs.push({
          email: user.email,
          userId: user.id,
          customerId: user.stripeCustomerId,
          subscriptions: activeSubs,
        });
      }
    }
  }
  
  if (usersWithMultipleSubs.length === 0) {
    console.log('✅ No users with multiple subscriptions found');
  }
  
  // STEP 4: Find ALL orphaned Stripe subscriptions (subscriptions for deleted users)
  console.log('\n=== STEP 4: Find orphaned Stripe subscriptions ===');
  const allStripeCustomers = await stripe.customers.list({ limit: 100 });
  const userCustomerIds = new Set(allUsers.map(u => u.stripeCustomerId).filter(Boolean));
  const orphanedSubscriptions: any[] = [];
  
  for (const customer of allStripeCustomers.data) {
    if (!userCustomerIds.has(customer.id)) {
      console.log(`⚠️  Orphaned customer: ${customer.id} (${customer.email})`);
      
      const subs = await stripe.subscriptions.list({
        customer: customer.id,
        limit: 100,
      });
      
      const activeSubs = subs.data.filter(s => s.status !== 'canceled');
      if (activeSubs.length > 0) {
        console.log(`   ❌ Has ${activeSubs.length} active subscription(s):`);
        
        for (const sub of activeSubs) {
          console.log(`   - ${sub.id} (status: ${sub.status})`);
          orphanedSubscriptions.push({
            customerId: customer.id,
            customerEmail: customer.email,
            subscriptionId: sub.id,
            status: sub.status,
          });
          
          // Cancel it
          console.log(`   ❌ Canceling: ${sub.id}`);
          await stripe.subscriptions.cancel(sub.id);
          console.log(`   ✅ Canceled: ${sub.id}`);
        }
      }
    }
  }
  
  if (orphanedSubscriptions.length === 0) {
    console.log('✅ No orphaned subscriptions found');
  }
  
  // FINAL SUMMARY
  console.log('\n=== CLEANUP SUMMARY ===');
  console.log(`Total users in database: ${allUsers.length}`);
  console.log(`Users with multiple subscriptions: ${usersWithMultipleSubs.length}`);
  console.log(`Orphaned subscriptions canceled: ${orphanedSubscriptions.length}`);
  
  if (orphanedSubscriptions.length > 0) {
    console.log('\n📋 Orphaned subscriptions that were canceled:');
    orphanedSubscriptions.forEach(o => {
      console.log(`   - ${o.subscriptionId} for ${o.customerEmail} (${o.customerId})`);
    });
  }
  
  console.log('\n✅ CLEANUP COMPLETE\n');
}

cleanupStripeSubscriptions().catch(console.error).finally(() => process.exit(0));
