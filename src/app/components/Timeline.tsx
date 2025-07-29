import { ReactNode } from 'react';

interface TimelineProps {
  children: ReactNode;
}

export default function Timeline({ children }: TimelineProps) {
  return (
    <div className="relative border-l-2 border-purple-300 pl-6">
      {children}
    </div>
  );
}

interface TimelineItemProps {
  timestamp: string;
  children: ReactNode;
  isLast?: boolean;
}

export function TimelineItem({ timestamp, children, isLast = false }: TimelineItemProps) {
  return (
    <div className={`relative mb-4 ${isLast ? '' : 'pb-4'}`}>
      <div className="absolute -left-7 top-1 w-4 h-4 bg-purple-500 rounded-full"></div>
      <p className="text-xs text-gray-500 font-sans mb-1">{timestamp}</p>
      {children}
    </div>
  );
}
