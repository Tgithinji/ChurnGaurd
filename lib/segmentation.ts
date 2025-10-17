// ============================================
// 14. CUSTOMER SEGMENTATION (lib/segmentation.ts)
// ============================================
export interface CustomerSegment {
  id: string;
  name: string;
  criteria: {
    minAmount?: number;
    maxAmount?: number;
    failureCount?: number;
    productNames?: string[];
    tags?: string[];
  };
  emailTemplate?: {
    subject: string;
    body: string;
  };
}

export class SegmentationEngine {
  private segments: CustomerSegment[];

  constructor(segments: CustomerSegment[]) {
    this.segments = segments;
  }

  findSegment(payment: { amount: number; product_name?: string }): CustomerSegment | null {
    for (const segment of this.segments) {
      if (this.matchesCriteria(payment, segment.criteria)) {
        return segment;
      }
    }
    return null;
  }

  private matchesCriteria(payment: { amount: number; product_name?: string }, criteria: CustomerSegment['criteria']): boolean {
    if (criteria.minAmount && payment.amount < criteria.minAmount) {
      return false;
    }
    if (criteria.maxAmount && payment.amount > criteria.maxAmount) {
      return false;
    }
    if (criteria.productNames && payment.product_name && !criteria.productNames.includes(payment.product_name)) {
      return false;
    }
    return true;
  }

  getSegmentTemplate(segmentId: string): { subject: string; body: string } | null {
    const segment = this.segments.find(s => s.id === segmentId);
    return segment?.emailTemplate || null;
  }
}

// Example segments
export const DEFAULT_SEGMENTS: CustomerSegment[] = [
  {
    id: 'high-value',
    name: 'High Value Customers',
    criteria: { minAmount: 100 },
    emailTemplate: {
      subject: '{name}, we value your business - let\'s resolve this quickly',
      body: 'Hi {name},\n\nWe noticed an issue with your payment for {product_name}. As a valued customer, we want to make sure you continue enjoying our premium service without interruption.\n\nPlease update your payment method here: {payment_update_link}\n\nNeed assistance? Reply to this email and our team will help immediately.\n\nThank you,\nThe Team'
    }
  },
  {
    id: 'standard',
    name: 'Standard Customers',
    criteria: { minAmount: 20, maxAmount: 99 },
    emailTemplate: {
      subject: 'Hey {name}, quick payment update needed 💳',
      body: 'Hi {name},\n\nYour payment for {product_name} ({amount}) needs attention.\n\nUpdate here: {payment_update_link}\n\nThanks!'
    }
  },
  {
    id: 'low-value',
    name: 'Budget Customers',
    criteria: { maxAmount: 19 },
    emailTemplate: {
      subject: '{name}, update your payment to keep access',
      body: 'Hi {name},\n\nYour payment for {product_name} failed. Update your card to continue: {payment_update_link}'
    }
  }
];