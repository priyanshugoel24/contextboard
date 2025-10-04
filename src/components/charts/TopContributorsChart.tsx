'use client';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { TopContributorsChartProps } from '@/interfaces/ui-components';

export default function TopContributorsChart({ data }: TopContributorsChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart 
        data={data.slice(0, 6)} 
        layout="horizontal"
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis 
          type="number"
          tick={{ fontSize: 12 }}
          className="text-muted-foreground"
        />
        <YAxis 
          type="category"
          dataKey="userName"
          tick={{ fontSize: 12 }}
          className="text-muted-foreground"
          width={100}
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '6px'
          }}
          formatter={(value, name) => [
            value,
            name === 'cardsCreated' ? 'Cards Created' : 'Cards Completed'
          ]}
        />
        <Legend />
        <Bar 
          dataKey="cardsCreated" 
          fill="#3b82f6" 
          name="Created"
          radius={[0, 2, 2, 0]}
        />
        <Bar 
          dataKey="cardsCompleted" 
          fill="#10b981" 
          name="Completed"
          radius={[0, 2, 2, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
