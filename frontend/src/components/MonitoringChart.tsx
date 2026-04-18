import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';

export type DataPoint = {
  label: string;
  systolic?: number;
  diastolic?: number;
  hr?: number;
};

interface MonitoringChartProps {
  data: DataPoint[];
  type: 'bp' | 'hr';
  className?: string;
}

export function MonitoringChart({ data, type, className }: MonitoringChartProps) {
  const chartHeight = 200;
  const chartWidth = 600;
  const paddingX = 40;
  const paddingY = 30;

  // Derive min/max values dynamically
  const { minVal, maxVal } = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    data.forEach(d => {
      const vals = type === 'bp' ? [d.systolic, d.diastolic] : [d.hr];
      vals.forEach(v => {
        if (v !== undefined) {
          if (v < min) min = v;
          if (v > max) max = v;
        }
      });
    });

    if (min === Infinity || max === -Infinity) {
      if (type === 'bp') { min = 60; max = 180; }
      else { min = 50; max = 150; }
    }

    // Add padding to domain
    const range = max - min;
    const paddedMin = Math.max(0, min - range * 0.2);
    const paddedMax = max + range * 0.2;
    
    // Nice round numbers
    return { 
      minVal: Math.floor(paddedMin / 10) * 10, 
      maxVal: Math.ceil(paddedMax / 10) * 10 
    };
  }, [data, type]);

  // Determine trend
  const trend = useMemo(() => {
    if (data.length < 2) return 'stable';
    const first = data[0];
    const last = data[data.length - 1];
    
    let diff = 0;
    if (type === 'bp') {
      const s1 = first.systolic ?? 0;
      const s2 = last.systolic ?? 0;
      diff = s2 - s1;
    } else {
      const h1 = first.hr ?? 0;
      const h2 = last.hr ?? 0;
      diff = h2 - h1;
    }

    if (Math.abs(diff) < 5) return 'stable';
    if (diff > 0) return 'rising';
    return 'dropping';
  }, [data, type]);

  // Generate path data
  const generatePath = (key: 'systolic' | 'diastolic' | 'hr') => {
    if (data.length === 0) return '';
    
    return data.map((d, i) => {
      const val = d[key];
      if (val === undefined) return '';
      
      const x = paddingX + (i * (chartWidth - paddingX * 2)) / Math.max(1, data.length - 1);
      const y = chartHeight - paddingY - ((val - minVal) / (maxVal - minVal)) * (chartHeight - paddingY * 2);
      
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
  };

  const getPoints = (key: 'systolic' | 'diastolic' | 'hr') => {
    return data.map((d, i) => {
      const val = d[key];
      if (val === undefined) return null;
      
      const x = paddingX + (i * (chartWidth - paddingX * 2)) / Math.max(1, data.length - 1);
      const y = chartHeight - paddingY - ((val - minVal) / (maxVal - minVal)) * (chartHeight - paddingY * 2);
      
      return { x, y, val, label: d.label };
    }).filter(p => p !== null) as {x: number, y: number, val: number, label: string}[];
  };

  const systolicPath = type === 'bp' ? generatePath('systolic') : '';
  const diastolicPath = type === 'bp' ? generatePath('diastolic') : '';
  const hrPath = type === 'hr' ? generatePath('hr') : '';

  const systolicPoints = type === 'bp' ? getPoints('systolic') : [];
  const diastolicPoints = type === 'bp' ? getPoints('diastolic') : [];
  const hrPoints = type === 'hr' ? getPoints('hr') : [];

  const mainColor = type === 'bp' ? 'hsl(var(--health-indigo))' : 'hsl(var(--health-rose))';
  const secondaryColor = 'hsl(var(--health-cyan))';

  return (
    <div className={cn("flex flex-col", className)}>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {type === 'bp' ? (
            <>
              <div className="flex items-center gap-1 text-xs text-muted-foreground mr-2">
                <span className="w-3 h-0.5 rounded-full bg-health-indigo block"></span> Systolic
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span className="w-3 h-0.5 rounded-full bg-health-cyan block"></span> Diastolic
              </div>
            </>
          ) : (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span className="w-3 h-0.5 rounded-full bg-health-rose block"></span> Heart Rate
            </div>
          )}
        </div>
        
        <div className={cn("text-[11px] font-semibold flex items-center gap-1 px-2 py-0.5 rounded-full border", 
          trend === 'rising' ? "text-rose-600 bg-rose-500/10 border-rose-500/20" :
          trend === 'dropping' ? "text-emerald-600 bg-emerald-500/10 border-emerald-500/20" :
          "text-amber-600 bg-amber-500/10 border-amber-500/20"
        )}>
          {trend === 'rising' ? <TrendingUp className="w-3 h-3"/> :
           trend === 'dropping' ? <TrendingDown className="w-3 h-3"/> :
           <Minus className="w-3 h-3"/>}
          {trend.charAt(0).toUpperCase() + trend.slice(1)}
        </div>
      </div>
      
      <div className="relative w-full overflow-hidden rounded-xl bg-card border border-border/50" style={{ paddingBottom: '33%' }}>
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="absolute inset-0 h-full w-full"
          preserveAspectRatio="none"
        >
          {/* Grid lines */}
          <line x1={paddingX} y1={paddingY} x2={chartWidth - paddingX} y2={paddingY} stroke="currentColor" strokeOpacity="0.1" strokeDasharray="4 4" />
          <line x1={paddingX} y1={chartHeight / 2} x2={chartWidth - paddingX} y2={chartHeight / 2} stroke="currentColor" strokeOpacity="0.1" strokeDasharray="4 4" />
          <line x1={paddingX} y1={chartHeight - paddingY} x2={chartWidth - paddingX} y2={chartHeight - paddingY} stroke="currentColor" strokeOpacity="0.1" />

          {/* Y-axis labels */}
          <text x={paddingX - 10} y={paddingY + 4} fontSize="12" fill="currentColor" opacity="0.5" textAnchor="end">{maxVal}</text>
          <text x={paddingX - 10} y={chartHeight / 2 + 4} fontSize="12" fill="currentColor" opacity="0.5" textAnchor="end">{Math.round((maxVal + minVal) / 2)}</text>
          <text x={paddingX - 10} y={chartHeight - paddingY + 4} fontSize="12" fill="currentColor" opacity="0.5" textAnchor="end">{minVal}</text>

          {/* X-axis labels */}
          {data.map((d, i) => {
            const x = paddingX + (i * (chartWidth - paddingX * 2)) / Math.max(1, data.length - 1);
            return (
              <text key={`x-${i}`} x={x} y={chartHeight - 10} fontSize="10" fill="currentColor" opacity="0.5" textAnchor="middle">
                {d.label}
              </text>
            );
          })}

          {/* Paths */}
          {type === 'bp' && (
            <>
              {diastolicPath && <path d={diastolicPath} fill="none" stroke={secondaryColor} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="animate-[fade-in_1s_ease-out]" />}
              {systolicPath && <path d={systolicPath} fill="none" stroke={mainColor} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="animate-[fade-in_1s_ease-out]" />}
              
              {/* Points */}
              {diastolicPoints.map((p, i) => (
                <g key={`dp-${i}`} className="animate-[fade-in_1s_ease-out]">
                  <circle cx={p.x} cy={p.y} r="4" fill="var(--background)" stroke={secondaryColor} strokeWidth="2" />
                  {i === diastolicPoints.length - 1 && (
                    <text x={p.x} y={p.y - 10} fontSize="12" fontWeight="bold" fill={secondaryColor} textAnchor="middle">{p.val}</text>
                  )}
                </g>
              ))}
              {systolicPoints.map((p, i) => (
                <g key={`sp-${i}`} className="animate-[fade-in_1s_ease-out]">
                  <circle cx={p.x} cy={p.y} r="4" fill="var(--background)" stroke={mainColor} strokeWidth="2" />
                  {i === systolicPoints.length - 1 && (
                    <text x={p.x} y={p.y - 10} fontSize="12" fontWeight="bold" fill={mainColor} textAnchor="middle">{p.val}</text>
                  )}
                </g>
              ))}
            </>
          )}

          {type === 'hr' && (
            <>
              {hrPath && <path d={hrPath} fill="none" stroke={mainColor} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="animate-[fade-in_1s_ease-out]" />}
              {hrPoints.map((p, i) => (
                <g key={`hp-${i}`} className="animate-[fade-in_1s_ease-out]">
                  <circle cx={p.x} cy={p.y} r="4" fill="var(--background)" stroke={mainColor} strokeWidth="2" />
                  {i === hrPoints.length - 1 && (
                    <text x={p.x} y={p.y - 10} fontSize="12" fontWeight="bold" fill={mainColor} textAnchor="middle">{p.val}</text>
                  )}
                </g>
              ))}
            </>
          )}
        </svg>
      </div>
    </div>
  );
}
