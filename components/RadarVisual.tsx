import React from 'react';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, 
  PolarRadiusAxis, ResponsiveContainer 
} from 'recharts';

interface RadarVisualProps {
  data: { subject: string; fullMark: number; value: number }[];
}

const RadarVisual: React.FC<RadarVisualProps> = ({ data }) => {
  return (
    <div className="h-[400px] w-full mt-16 opacity-95">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
          <PolarGrid stroke="#555" strokeWidth={0.5} />
          <PolarAngleAxis 
            dataKey="subject" 
            tick={{ fill: '#d1d1d1', fontSize: 13, fontWeight: 700, letterSpacing: '0.25em' }} 
          />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
          <Radar
            name="影響力"
            dataKey="value"
            stroke="#c5a044"
            strokeWidth={2.5}
            fill="#a30000"
            fillOpacity={0.2}
            animationDuration={2500}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default RadarVisual;