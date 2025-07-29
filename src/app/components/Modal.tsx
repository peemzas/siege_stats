import { ReactNode, useEffect, useState, useCallback } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
}

export default function Modal({ isOpen, onClose, children }: ModalProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Function to unlock scroll - extracted to ensure consistency
  const unlockScroll = useCallback(() => {
    document.body.style.overflow = '';
  }, []);

  // Function to lock scroll
  const lockScroll = useCallback(() => {
    document.body.style.overflow = 'hidden';
  }, []);
  
  // Handle animation state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      lockScroll();
    } else {
      setIsAnimating(false);
      unlockScroll();
    }
    
    // Always clean up by removing scroll lock when unmounted
    return unlockScroll;
  }, [isOpen, lockScroll, unlockScroll]);

  // Handle ESC key press
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
    }
    
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex justify-center items-center"
      onClick={onClose}
    >
      {/* Backdrop with blur effect */}
      <div className="absolute inset-0 backdrop-blur-sm"></div>
      
      {/* Modal container - centered with 70% height */}
      <div 
        className={`relative transform transition-all duration-300 ease-out ${isAnimating ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'} w-full max-w-2xl h-[70vh] mx-auto my-0`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal content */}
        <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-2xl overflow-hidden border border-purple-100 h-full flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-200 to-purple-200 p-4 flex justify-between items-center">
            <div className="h-4"></div> {/* Spacer for symmetry */}
            <button 
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white bg-opacity-20 flex items-center justify-center text-gray-700 hover:bg-white hover:text-purple-700 transition-colors duration-200"
              aria-label="Close modal"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
          
          {/* Content with scrolling - flex-grow to fill available space */}
          <div className="overflow-y-auto p-6 flex-grow">
            {children}
          </div>
          
          {/* Footer with gradient */}
          <div className="bg-gradient-to-r from-blue-100 to-purple-100 p-4 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
