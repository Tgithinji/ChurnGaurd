// ============================================
// 9. EXPORT DATA (api/export/route.ts)
// ============================================
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const format = req.nextUrl.searchParams.get('format') || 'json';

    const { data: payments } = await supabase
      .from('failed_payments')
      .select('*')
      .eq('creator_id', user.id)
      .order('created_at', { ascending: false });

    if (!payments) {
      return NextResponse.json({ error: 'No data found' }, { status: 404 });
    }

    if (format === 'csv') {
      const csv = convertToCSV(payments);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="churnguard-export-${Date.now()}.csv"`
        }
      });
    }

    // Return JSON
    return NextResponse.json(payments);
  } catch (error: unknown) {
    console.error('Error exporting data:', error);
    return NextResponse.json(
      { error: 'Failed to export data', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

function convertToCSV(data: Record<string, unknown>[]): string {
  if (data.length === 0) return '';

  const headers = Object.keys(data[0]);
  const csvRows = [];

  // Add header row
  csvRows.push(headers.join(','));

  // Add data rows
  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      // Escape quotes and wrap in quotes if contains comma
      const escaped = String(value).replace(/"/g, '""');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(','));
  }

  return csvRows.join('\n');
}