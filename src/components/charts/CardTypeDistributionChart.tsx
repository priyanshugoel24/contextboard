'use client';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';
import { analyticsConfig } from '@/config/analytics';
import { CardTypeDistributionChartProps } from '@/interfaces/ui-components';

export default function CardTypeDistributionChart({ data }: CardTypeDistributionChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          outerRadius={80}
          fill="#8884d8"
          dataKey="count"
          label={({ type, percentage }) => `${type}: ${percentage}%`}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={analyticsConfig.chartColors[index % analyticsConfig.chartColors.length]} />
          ))}
        </Pie>
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '6px'
          }}
          formatter={((value: unknown, name: unknown, props: { payload?: { percentage?: number } }) => {
            const count = Number(value) || 0;
            const percentage = props?.payload?.percentage || 0;
            return [`${count} cards (${percentage}%)`, String(name)];
          })}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
