// ============================================
// 6. CUSTOMER INSIGHTS (lib/customer-insights.ts)
// ============================================
import { supabaseAdmin } from './supabase';

export interface CustomerInsight {
  customerId: string;
  email: string;
  totalFailures: number;
  totalRecoveries: number;
  lifetimeValue: number;
  averageFailureAmount: number;
  lastFailureDate: Date;
  riskScore: number; // 0-100, higher = more at risk
}

export async function getCustomerInsights(
  creatorId: string
): Promise<CustomerInsight[]> {
  const { data: payments } = await supabaseAdmin
    .from('failed_payments')
    .select('*')
    .eq('creator_id', creatorId);

  if (!payments) return [];

  // Group by customer
  const customerMap = new Map<string, typeof payments>();
  payments.forEach(payment => {
    const existing = customerMap.get(payment.stripe_customer_id) || [];
    existing.push(payment);
    customerMap.set(payment.stripe_customer_id, existing);
  });

  // Calculate insights
  const insights: CustomerInsight[] = [];
  
  customerMap.forEach((customerPayments, customerId) => {
    const failures = customerPayments.filter(p => p.status === 'failed');
    const recoveries = customerPayments.filter(p => p.status === 'recovered');
    
    const totalAmount = recoveries.reduce((sum, p) => sum + Number(p.amount), 0);
    const avgFailureAmount = failures.length > 0
      ? failures.reduce((sum, p) => sum + Number(p.amount), 0) / failures.length
      : 0;

    // Calculate risk score
    const failureRate = customerPayments.length > 0
      ? (failures.length / customerPayments.length) * 100
      : 0;
    const recentFailures = failures.filter(f => {
      const daysSince = (Date.now() - new Date(f.created_at).getTime()) / (1000 * 60 * 60 * 24);
      return daysSince < 30;
    }).length;

    const riskScore = Math.min(100, failureRate + (recentFailures * 10));

    const lastPayment = customerPayments.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0];

    insights.push({
      customerId,
      email: lastPayment.customer_email,
      totalFailures: failures.length,
      totalRecoveries: recoveries.length,
      lifetimeValue: totalAmount,
      averageFailureAmount: avgFailureAmount,
      lastFailureDate: new Date(lastPayment.created_at),
      riskScore
    });
  });

  return insights.sort((a, b) => b.riskScore - a.riskScore);
}