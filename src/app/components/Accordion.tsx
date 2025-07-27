import { useState, ReactNode } from 'react';

interface AccordionProps {
  title: ReactNode;
  children: ReactNode;
  bgColor?: string; // Optional background color prop
}

export default function Accordion({ title, children, bgColor = 'bg-white' }: AccordionProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`rounded-xl shadow-md mb-4 ${bgColor}`}>
      <div
        className="relative cursor-pointer p-4"
        onClick={() => setIsOpen(!isOpen)}
      >
        {/* Preserve the title's grid structure */}
        {title}
        
        {/* Position the arrow absolutely to avoid affecting grid layout */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 pr-4">
          <svg
            className={`w-6 h-6 transition-transform transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </div>
      {isOpen && <div className="p-4 bg-white border-t border-gray-200">{children}</div>}
    </div>
  );
}
