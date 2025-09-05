import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface TutorialStep {
  id: string;
  title: string;
  content: string;
  targetSelector: string;
  position: 'top' | 'bottom' | 'left' | 'right';
}

interface OnboardingTutorialProps {
  onComplete: () => void;
  onSkip: () => void;
}

const tutorialSteps: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Hi, welcome to ForeScore!',
    content: 'Create a new game to begin!',
    targetSelector: '[data-testid="button-create-group"]',
    position: 'top'
  },
  {
    id: 'tabs',
    title: 'View your active games here',
    content: 'Switch between your 2/9/16 points game and card game using these tabs.',
    targetSelector: '[data-testid="tab-points"], [data-testid="tab-deck"]',
    position: 'top'
  },
  {
    id: 'payouts',
    title: 'You can see Who Owes Who here',
    content: 'Check calculated payouts and money exchanges in this tab.',
    targetSelector: '[data-testid="tab-scoreboard"]',
    position: 'top'
  },
  {
    id: 'rules',
    title: 'Check out the Rules for more detailed information',
    content: 'Learn the complete game rules and how scoring works.',
    targetSelector: '[data-testid="tab-rules"]',
    position: 'top'
  }
];

export function OnboardingTutorial({ onComplete, onSkip }: OnboardingTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const { toast } = useToast();

  const currentStepData = tutorialSteps[currentStep];

  // Calculate spotlight position for current target
  const [spotlightPosition, setSpotlightPosition] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);

  const updateSpotlight = useCallback(() => {
    if (!currentStepData?.targetSelector) return;

    const targets = document.querySelectorAll(currentStepData.targetSelector);
    if (targets.length === 0) {
      // Retry after a short delay to allow DOM updates
      setTimeout(() => updateSpotlight(), 100);
      return;
    }

    // If multiple targets (like tabs), get bounding box of all
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    targets.forEach(target => {
      const rect = target.getBoundingClientRect();
      minX = Math.min(minX, rect.left);
      minY = Math.min(minY, rect.top);
      maxX = Math.max(maxX, rect.right);
      maxY = Math.max(maxY, rect.bottom);
    });

    const padding = 8;
    setSpotlightPosition({
      top: minY - padding,
      left: minX - padding,
      width: maxX - minX + padding * 2,
      height: maxY - minY + padding * 2,
    });
  }, [currentStepData?.targetSelector]);

  useEffect(() => {
    updateSpotlight();
    const handleResize = () => updateSpotlight();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [updateSpotlight]);

  // Handle click-to-advance
  useEffect(() => {
    if (!currentStepData?.targetSelector) return;

    const handleTargetClick = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
      
      if (currentStep < tutorialSteps.length - 1) {
        setCurrentStep(currentStep + 1);
      } else {
        handleComplete();
      }
    };

    const targets = document.querySelectorAll(currentStepData.targetSelector);
    targets.forEach(target => {
      target.addEventListener('click', handleTargetClick, { capture: true });
    });

    return () => {
      targets.forEach(target => {
        target.removeEventListener('click', handleTargetClick, { capture: true });
      });
    };
  }, [currentStep, currentStepData?.targetSelector]);

  const handleComplete = async () => {
    try {
      await apiRequest('POST', '/api/user/complete-tutorial', {});
      setIsVisible(false);
      onComplete();
      toast({
        title: "Welcome to ForeScore!",
        description: "You're all set! Start creating your first game.",
      });
    } catch (error) {
      console.error('Failed to mark tutorial as complete:', error);
      // Still complete the tutorial UI-wise
      setIsVisible(false);
      onComplete();
    }
  };

  const handleSkip = async () => {
    try {
      await apiRequest('POST', '/api/user/complete-tutorial', {});
      setIsVisible(false);
      onSkip();
    } catch (error) {
      console.error('Failed to mark tutorial as complete:', error);
      // Still skip the tutorial UI-wise
      setIsVisible(false);
      onSkip();
    }
  };

  if (!isVisible || !spotlightPosition) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Dark overlay with spotlight */}
      <div className="absolute inset-0 bg-black bg-opacity-75">
        {/* Spotlight cutout */}
        <div 
          className="absolute bg-transparent border-4 border-white shadow-2xl rounded-lg"
          style={{
            top: spotlightPosition.top,
            left: spotlightPosition.left,
            width: spotlightPosition.width,
            height: spotlightPosition.height,
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.75)',
          }}
        />
      </div>

      {/* Tutorial tooltip */}
      <div 
        className="absolute bg-white rounded-lg shadow-xl p-4 max-w-sm z-10 border border-gray-200"
        style={{
          top: currentStepData.position === 'bottom' 
            ? spotlightPosition.top + spotlightPosition.height + 16
            : spotlightPosition.top - 120,
          left: Math.max(16, Math.min(
            window.innerWidth - 256, // tooltip width + padding
            spotlightPosition.left + spotlightPosition.width / 2 - 128
          )),
        }}
      >
        {/* Step counter */}
        <div className="flex items-center justify-between mb-3">
          <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full text-xs font-medium">
            Step {currentStep + 1} of {tutorialSteps.length}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSkip}
            className="h-6 w-6 p-0 hover:bg-gray-100"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Tutorial content */}
        <h3 className="font-semibold text-gray-900 mb-2">
          {currentStepData.title}
        </h3>
        <p className="text-gray-600 text-sm mb-4">
          {currentStepData.content}
        </p>

        {/* Action instructions */}
        <div className="text-center">
          <p className="text-xs text-gray-500 mb-2">
            Click the highlighted element to continue
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSkip}
            className="text-xs"
          >
            Skip Tutorial
          </Button>
        </div>
      </div>
    </div>
  );
}