// ============================================
// 12. DASHBOARD WIDGETS (components/DashboardWidgets.tsx)
// ============================================
import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface MetricChange {
  value: number;
  percentage: number;
  trend: 'up' | 'down';
}

export const MetricCard: React.FC<{
  title: string;
  value: string | number;
  change?: MetricChange;
  icon: React.ReactNode;
}> = ({ title, value, change, icon }) => (
  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-3xl font-bold mt-2 text-gray-900">{value}</p>
        {change && (
          <div className="flex items-center mt-2 space-x-1">
            {change.trend === 'up' ? (
              <TrendingUp className="w-4 h-4 text-green-500" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-500" />
            )}
            <span className={`text-sm ${change.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
              {change.percentage}% from last month
            </span>
          </div>
        )}
      </div>
      <div className="p-3 bg-teal-50 rounded-full">
        {icon}
      </div>
    </div>
  </div>
);