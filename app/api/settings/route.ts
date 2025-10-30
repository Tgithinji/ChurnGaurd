// ============================================
// 9. SETTINGS API (app/api/settings/route.ts)
// ============================================
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  // DEVELOPMENT MODE: Auth disabled for testing
  // TODO: Re-enable authentication for production
  
  // const authHeader = req.headers.get('authorization');
  // const token = authHeader?.replace('Bearer ', '');

  // if (!token) {
  //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // }

  // const supabase = getSupabaseClient(token);
  // DEVELOPMENT: Use admin client to bypass RLS
  const supabase = supabaseAdmin;
  // const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  // if (authError || !user) {
  //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // }

  try {
    // DEVELOPMENT: Get first creator settings or return defaults
    const { data: settings, error } = await supabase
      .from('creator_settings')
      .select('*')
      // .eq('creator_id', user.id)  // Disabled for dev
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    // If no settings exist, return defaults
    if (!settings) {
      return NextResponse.json({
        webhook_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/webhooks/stripe`,
        email_subject: 'Please update your payment method',
        email_body: 'Your payment failed. Please update your payment method.'
      });
    }

    return NextResponse.json(settings);
  } catch (error: unknown) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  // DEVELOPMENT MODE: Auth disabled for testing
  // TODO: Re-enable authentication for production
  
  // const authHeader = req.headers.get('authorization');
  // const token = authHeader?.replace('Bearer ', '');

  // if (!token) {
  //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // }

  // const supabase = getSupabaseClient(token);
  // DEVELOPMENT: Use admin client to bypass RLS
  // const _supabase = supabaseAdmin;
  // const { data: { user }, error: authError } = await _supabase.auth.getUser();
  
  // if (authError || !user) {
  //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // }

  try {
    const body = await req.json();
    
    // DEVELOPMENT: Just return the body for now
    console.log('Settings update (dev mode):', body);
    return NextResponse.json({ ...body, message: 'Settings saved (dev mode)' });
    
    // TODO: Re-enable for production
    // const { data: settings, error } = await supabase
    //   .from('creator_settings')
    //   .upsert({
    //     creator_id: user.id,
    //     ...body,
    //     updated_at: new Date().toISOString()
    //   })
    //   .select()
    //   .single();

    // if (error) throw error;
    // return NextResponse.json(settings);
  } catch (error: unknown) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { error: 'Failed to update settings', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}