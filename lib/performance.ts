// ============================================
// 15. PERFORMANCE MONITORING (lib/performance.ts)
// ============================================
export class PerformanceMonitor {
  private metrics: Map<string, number[]>;

  constructor() {
    this.metrics = new Map();
  }

  recordMetric(name: string, value: number): void {
    const existing = this.metrics.get(name) || [];
    existing.push(value);
    
    // Keep only last 100 measurements
    if (existing.length > 100) {
      existing.shift();
    }
    
    this.metrics.set(name, existing);
  }

  getAverage(name: string): number {
    const values = this.metrics.get(name) || [];
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  getP95(name: string): number {
    const values = this.metrics.get(name) || [];
    if (values.length === 0) return 0;
    
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.floor(sorted.length * 0.95);
    return sorted[index];
  }

  reset(name?: string): void {
    if (name) {
      this.metrics.delete(name);
    } else {
      this.metrics.clear();
    }
  }

  getAllMetrics(): Record<string, { avg: number; p95: number; count: number }> {
    const result: Record<string, { avg: number; p95: number; count: number }> = {};
    
    this.metrics.forEach((values, name) => {
      result[name] = {
        avg: this.getAverage(name),
        p95: this.getP95(name),
        count: values.length
      };
    });
    
    return result;
  }
}

export const performanceMonitor = new PerformanceMonitor();

// Usage example:
// const start = Date.now();
// await someOperation();
// performanceMonitor.recordMetric('webhook_processing', Date.now() - start);
