import { useState } from 'react';
import LegalDialogs from './LegalDialogs';

interface LegalFooterProps {
  className?: string;
  variant?: 'light' | 'dark';
}

export function LegalFooter({ className = '', variant = 'light' }: LegalFooterProps) {
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  const handleDialogChange = (type: 'terms' | 'privacy', open: boolean) => {
    if (type === 'terms') setShowTerms(open);
    if (type === 'privacy') setShowPrivacy(open);
  };

  const textColor = variant === 'dark' ? 'text-gray-300' : 'text-gray-500';
  const hoverColor = variant === 'dark' ? 'hover:text-white' : 'hover:text-gray-700';

  return (
    <>
      <div className={`text-center text-xs ${textColor} ${className}`}>
        <div className="flex items-center justify-center space-x-2">
          <button
            onClick={() => setShowPrivacy(true)}
            className={`underline ${hoverColor} transition-colors`}
            data-testid="link-privacy-footer"
          >
            Privacy Policy
          </button>
          <span>•</span>
          <button
            onClick={() => setShowTerms(true)}
            className={`underline ${hoverColor} transition-colors`}
            data-testid="link-terms-footer"
          >
            Terms of Service
          </button>
        </div>
        <p className="mt-2">
          © {new Date().getFullYear()} danoNano, LLC dba ForeScore
        </p>
        <p className="mt-1">
          Contact: support@forescore.xyz
        </p>
      </div>
      
      <LegalDialogs 
        showTerms={showTerms}
        showPrivacy={showPrivacy}
        onOpenChange={handleDialogChange}
      />
    </>
  );
}
