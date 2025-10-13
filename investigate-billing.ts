import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

async function investigateBilling() {
  const customerId = 'cus_T04bsjR7P2eAPp'; // daniel@danonano.com
  
  console.log('\n=== INVESTIGATING STRIPE BILLING FOR daniel@danonano.com ===\n');
  
  // Get all invoices
  const invoices = await stripe.invoices.list({
    customer: customerId,
    limit: 100,
  });
  
  console.log(`📋 INVOICES (${invoices.data.length} total):`);
  invoices.data.forEach((inv, idx) => {
    console.log(`\n${idx + 1}. Invoice ${inv.id}`);
    console.log(`   Created: ${new Date(inv.created * 1000).toISOString()}`);
    console.log(`   Amount: $${(inv.amount_due / 100).toFixed(2)}`);
    console.log(`   Status: ${inv.status}`);
    console.log(`   Paid: ${inv.paid}`);
    console.log(`   Subscription: ${inv.subscription}`);
    if (inv.period_start && inv.period_end) {
      console.log(`   Period: ${new Date(inv.period_start * 1000).toISOString()} to ${new Date(inv.period_end * 1000).toISOString()}`);
    }
  });
  
  // Get all charges
  const charges = await stripe.charges.list({
    customer: customerId,
    limit: 100,
  });
  
  console.log(`\n\n💳 CHARGES (${charges.data.length} total):`);
  charges.data.forEach((charge, idx) => {
    console.log(`\n${idx + 1}. Charge ${charge.id}`);
    console.log(`   Created: ${new Date(charge.created * 1000).toISOString()}`);
    console.log(`   Amount: $${(charge.amount / 100).toFixed(2)}`);
    console.log(`   Status: ${charge.status}`);
    console.log(`   Paid: ${charge.paid}`);
    console.log(`   Invoice: ${charge.invoice}`);
    console.log(`   Description: ${charge.description}`);
  });
  
  // Get all subscriptions
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    limit: 100,
  });
  
  console.log(`\n\n🔄 SUBSCRIPTIONS (${subscriptions.data.length} total):`);
  subscriptions.data.forEach((sub, idx) => {
    console.log(`\n${idx + 1}. Subscription ${sub.id}`);
    console.log(`   Status: ${sub.status}`);
    console.log(`   Created: ${new Date(sub.created * 1000).toISOString()}`);
    if (sub.current_period_start && sub.current_period_end) {
      console.log(`   Current Period: ${new Date(sub.current_period_start * 1000).toISOString()} to ${new Date(sub.current_period_end * 1000).toISOString()}`);
    }
    if (sub.trial_start && sub.trial_end) {
      console.log(`   Trial: ${new Date(sub.trial_start * 1000).toISOString()} to ${new Date(sub.trial_end * 1000).toISOString()}`);
    }
    console.log(`   Cancel at period end: ${sub.cancel_at_period_end}`);
  });
  
  // Look for duplicate charges
  console.log('\n\n⚠️  ANALYZING FOR DUPLICATE CHARGES:');
  const chargeAmounts = charges.data.map(c => ({
    amount: c.amount,
    date: new Date(c.created * 1000),
    id: c.id,
    paid: c.paid
  }));
  
  const duplicates = chargeAmounts.filter((charge, idx) => {
    return chargeAmounts.some((other, otherIdx) => {
      if (idx >= otherIdx) return false;
      const timeDiff = Math.abs(charge.date.getTime() - other.date.getTime());
      return charge.amount === other.amount && timeDiff < 86400000; // within 24 hours
    });
  });
  
  if (duplicates.length > 0) {
    console.log(`\n❌ FOUND ${duplicates.length} POTENTIAL DUPLICATE CHARGES:`);
    duplicates.forEach(dup => {
      console.log(`   - ${dup.id}: $${(dup.amount / 100).toFixed(2)} on ${dup.date.toISOString()} (Paid: ${dup.paid})`);
    });
  } else {
    console.log('\n✅ No duplicate charges detected');
  }
  
  console.log('\n=== END OF INVESTIGATION ===\n');
}

investigateBilling().catch(console.error);
