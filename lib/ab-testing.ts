// ============================================
// 13. A/B TESTING FRAMEWORK (lib/ab-testing.ts)
// ============================================
import { supabaseAdmin } from './supabase';

export interface EmailVariant {
  id: string;
  name: string;
  subject: string;
  body: string;
  weight: number; // 0-100, percentage of traffic
}

export class ABTestManager {
  private variants: EmailVariant[];

  constructor(variants: EmailVariant[]) {
    this.variants = variants;
  }

  selectVariant(customerId: string): EmailVariant {
    // Use customer ID for consistent variant assignment
    const hash = this.hashCode(customerId);
    const normalizedHash = Math.abs(hash) % 100;

    let cumulativeWeight = 0;
    for (const variant of this.variants) {
      cumulativeWeight += variant.weight;
      if (normalizedHash < cumulativeWeight) {
        return variant;
      }
    }

    return this.variants[0]; // fallback
  }

  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash;
  }

  async recordResult(
    variantId: string,
    customerId: string,
    recovered: boolean
  ): Promise<void> {
    await supabaseAdmin.from('ab_test_results').insert({
      variant_id: variantId,
      customer_id: customerId,
      recovered,
      recorded_at: new Date().toISOString()
    });
  }

  async getVariantPerformance(): Promise<Map<string, { sent: number; recovered: number; rate: number }>> {
    const { data: results } = await supabaseAdmin
      .from('ab_test_results')
      .select('*');

    if (!results) return new Map();

    const performance = new Map();
    
    this.variants.forEach(variant => {
      const variantResults = results.filter(r => r.variant_id === variant.id);
      const sent = variantResults.length;
      const recovered = variantResults.filter(r => r.recovered).length;
      const rate = sent > 0 ? (recovered / sent) * 100 : 0;

      performance.set(variant.id, { sent, recovered, rate });
    });

    return performance;
  }
}