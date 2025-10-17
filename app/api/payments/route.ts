// ============================================
// 8. PAYMENTS API (app/api/payments/route.ts)
// ============================================
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient, supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  // DEVELOPMENT MODE: Auth disabled for testing
  // TODO: Re-enable authentication for production
  
  // Get auth token from header
  // const authHeader = req.headers.get('authorization');
  // const token = authHeader?.replace('Bearer ', '');

  // if (!token) {
  //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // }

  // const supabase = getSupabaseClient(token);
  // DEVELOPMENT: Use admin client to bypass RLS
  const supabase = supabaseAdmin;

  // Verify user
  // const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  // if (authError || !user) {
  //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // }

  try {
    // Get all payments for this creator
    // DEVELOPMENT: Using first creator or all payments
    const { data: payments, error: paymentsError } = await supabase
      .from('failed_payments')
      .select('*')
      // .eq('creator_id', user.id)  // Disabled for dev
      .order('created_at', { ascending: false });

    if (paymentsError) throw paymentsError;

    // Calculate stats
    const totalFailed = payments?.filter(p => p.status === 'failed').length || 0;
    const totalRecovered = payments?.filter(p => p.status === 'recovered').length || 0;
    const recoveredRevenue = payments
      ?.filter(p => p.status === 'recovered')
      .reduce((sum, p) => sum + Number(p.amount), 0) || 0;
    const recoveryRate = payments?.length ? (totalRecovered / payments.length) * 100 : 0;

    return NextResponse.json({
      stats: {
        totalFailed,
        totalRecovered,
        recoveredRevenue: recoveredRevenue.toFixed(2),
        recoveryRate: recoveryRate.toFixed(1),
      },
      payments: payments || [],
    });
  } catch (error: unknown) {
    console.error('Error fetching payments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payments', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
