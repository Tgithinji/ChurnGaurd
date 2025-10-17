// ============================================
// 2. ANALYTICS & REPORTING (lib/analytics.ts)
// ============================================
import { supabaseAdmin } from './supabase';

export interface AnalyticsReport {
  period: string;
  totalFailed: number;
  totalRecovered: number;
  recoveryRate: number;
  totalRevenue: number;
  avgRecoveryTime: number; // in hours
  topProducts: Array<{ name: string; count: number; revenue: number }>;
}

export async function generateAnalyticsReport(
  creatorId: string,
  startDate: Date,
  endDate: Date
): Promise<AnalyticsReport> {
  // Get all payments in period
  const { data: payments } = await supabaseAdmin
    .from('failed_payments')
    .select('*')
    .eq('creator_id', creatorId)
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString());

  if (!payments || payments.length === 0) {
    return {
      period: `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`,
      totalFailed: 0,
      totalRecovered: 0,
      recoveryRate: 0,
      totalRevenue: 0,
      avgRecoveryTime: 0,
      topProducts: []
    };
  }

  const totalFailed = payments.filter(p => p.status === 'failed').length;
  const recovered = payments.filter(p => p.status === 'recovered');
  const totalRecovered = recovered.length;
  const totalRevenue = recovered.reduce((sum, p) => sum + Number(p.amount), 0);
  
  // Calculate average recovery time
  const recoveryTimes = recovered
    .filter(p => p.recovered_at)
    .map(p => {
      const created = new Date(p.created_at).getTime();
      const recovered = new Date(p.recovered_at!).getTime();
      return (recovered - created) / (1000 * 60 * 60); // hours
    });
  
  const avgRecoveryTime = recoveryTimes.length > 0
    ? recoveryTimes.reduce((a, b) => a + b, 0) / recoveryTimes.length
    : 0;

  // Top products by recovery
  const productStats = payments.reduce((acc, p) => {
    if (!acc[p.product_name]) {
      acc[p.product_name] = { count: 0, revenue: 0 };
    }
    if (p.status === 'recovered') {
      acc[p.product_name].count++;
      acc[p.product_name].revenue += Number(p.amount);
    }
    return acc;
  }, {} as Record<string, { count: number; revenue: number }>);

  const topProducts = Object.entries(productStats)
    .map(([name, stats]) => ({ 
      name, 
      count: (stats as { count: number; revenue: number }).count, 
      revenue: (stats as { count: number; revenue: number }).revenue 
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  return {
    period: `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`,
    totalFailed,
    totalRecovered,
    recoveryRate: payments.length > 0 ? (totalRecovered / payments.length) * 100 : 0,
    totalRevenue,
    avgRecoveryTime,
    topProducts
  };
}
