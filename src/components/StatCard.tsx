import { LucideIcon } from 'lucide-react';
import { useEffect, useState } from 'react';

interface StatCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  color: 'rose' | 'champagne' | 'mint' | 'ink';
  suffix?: string;
}

const colorMap = {
  rose: {
    bg: 'from-rose-100 to-rose-50',
    border: 'border-rose-200',
    iconBg: 'bg-rose-300 text-white',
    text: 'text-rose-600',
  },
  champagne: {
    bg: 'from-champagne-50 to-champagne-100',
    border: 'border-champagne-200',
    iconBg: 'bg-champagne-300 text-white',
    text: 'text-champagne-400',
  },
  mint: {
    bg: 'from-mint-100 to-white',
    border: 'border-mint-200',
    iconBg: 'bg-mint-300 text-white',
    text: 'text-mint-400',
  },
  ink: {
    bg: 'from-sand-50 to-white',
    border: 'border-sand-200',
    iconBg: 'bg-ink-600 text-white',
    text: 'text-ink-600',
  },
};

function useAnimatedNumber(target: number, duration = 600) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let startTime: number | null = null;
    let rafId: number;
    const start = 0;
    const animate = (ts: number) => {
      if (startTime === null) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(start + (target - start) * easeOut));
      if (progress < 1) rafId = requestAnimationFrame(animate);
    };
    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [target, duration]);
  return value;
}

export default function StatCard({ label, value, icon: Icon, color, suffix }: StatCardProps) {
  const c = colorMap[color];
  const animatedValue = useAnimatedNumber(value);
  return (
    <div className={`relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br ${c.bg} border ${c.border} shadow-card hover:shadow-hover hover:-translate-y-0.5 transition-all duration-300`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-ink-600 mb-1">{label}</p>
          <p className={`font-serif text-3xl sm:text-4xl font-bold ${c.text} tracking-tight`}>
            {animatedValue.toLocaleString()}
            {suffix && <span className="text-lg ml-0.5 font-sans font-medium">{suffix}</span>}
          </p>
        </div>
        <div className={`p-2.5 rounded-xl ${c.iconBg} shadow-soft`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
      <div className="absolute -right-8 -bottom-8 w-24 h-24 rounded-full opacity-30 bg-gradient-to-br from-white to-transparent" />
    </div>
  );
}
