import { FileX } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
}

export default function EmptyState({
  title = '暂无数据',
  description = '点击上方按钮添加第一条数据吧~',
  icon,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center animate-fade-in">
      <div className="w-20 h-20 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center mb-4">
        {icon ?? <FileX className="w-9 h-9 text-rose-300" />}
      </div>
      <h4 className="font-serif text-lg font-semibold text-ink-700 mb-1">{title}</h4>
      <p className="text-sm text-ink-500 max-w-xs">{description}</p>
    </div>
  );
}
