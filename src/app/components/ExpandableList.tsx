import { useState, ReactNode } from 'react';

interface ExpandableListProps {
  items: any[];
  renderItem: (item: any, index: number) => ReactNode;
  initialVisibleCount?: number;
}

export default function ExpandableList({ items, renderItem, initialVisibleCount = 5 }: ExpandableListProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const visibleItems = isExpanded ? items : items.slice(0, initialVisibleCount);

  return (
    <div>
      <ul className="space-y-2 pl-4">
        {visibleItems.map((item, index) => renderItem(item, index))}
      </ul>
      {items.length > initialVisibleCount && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-sm text-purple-500 hover:underline mt-2"
        >
          {isExpanded ? 'Show Less' : 'Show More'}
        </button>
      )}
    </div>
  );
}
