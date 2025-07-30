import { ReactNode, useState, useRef, useEffect, memo } from 'react';

interface AccordionProps {
  title: ReactNode;
  children: ReactNode;
  bgColor?: string;
  defaultOpen?: boolean;
}

// Memoize the component to prevent unnecessary re-renders
const Accordion = memo(function Accordion({
  title, 
  children, 
  bgColor = 'bg-white',
  defaultOpen = false
}: AccordionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [contentLoaded, setContentLoaded] = useState(defaultOpen);
  const contentRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  
  // Measure and animate the content height when open state changes
  useEffect(() => {
    // Always cancel any ongoing animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    
    // Load content as soon as accordion starts to open
    if (isOpen && !contentLoaded) {
      setContentLoaded(true);
    }
    
    // Skip animation if the content ref isn't ready
    if (!contentRef.current) return;
    
    // Get the final height we want to animate to
    const finalHeight = isOpen ? contentRef.current.scrollHeight : 0;
    
    // Set an explicit height to start the animation from
    if (isOpen) {
      // When opening, start from 0
      contentRef.current.style.height = '0px';
      
      // Force a reflow
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      contentRef.current.offsetHeight;
      
      // Animate to the final height
      contentRef.current.style.height = `${finalHeight}px`;
      
      // After animation completes, set to auto to handle content changes
      const handleTransitionEnd = () => {
        if (isOpen && contentRef.current) {
          contentRef.current.style.height = 'auto';
        }
        
        // Clean up this event handler
        contentRef.current?.removeEventListener('transitionend', handleTransitionEnd);
      };
      
      contentRef.current.addEventListener('transitionend', handleTransitionEnd, { once: true });
    } else {
      // When closing, start from current height
      contentRef.current.style.height = `${contentRef.current.scrollHeight}px`;
      
      // Force a reflow
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      contentRef.current.offsetHeight;
      
      // Animate to zero
      contentRef.current.style.height = '0px';
    }
  }, [isOpen, contentLoaded]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Handle toggle click
  const toggleAccordion = () => {
    setIsOpen(prev => !prev);
  };

  return (
    <div className={`rounded-xl shadow-md mb-4 ${bgColor}`}>
      {/* Accordion header */}
      <div 
        className="relative cursor-pointer p-4 max-h-16 flex items-center"
        onClick={toggleAccordion}
        aria-expanded={isOpen}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            toggleAccordion();
            e.preventDefault();
          }
        }}
      >
        {title}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 pr-4">
          <svg 
            className={`w-6 h-6 transition-transform transform ${isOpen ? 'rotate-180' : ''}`}
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Accordion content with CSS transition */}
      <div 
        ref={contentRef}
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{ height: 0 }} // Initial height is zero
      >
        {/* Only render children when content is loaded (lazy loading) */}
        {contentLoaded && (
          <div className="p-4 border-t">
            {children}
          </div>
        )}
      </div>
    </div>
  );
});

export default Accordion;
