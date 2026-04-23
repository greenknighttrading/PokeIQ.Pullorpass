import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Brain, Sparkles, Target, PieChart } from 'lucide-react';

interface AnalyzingLoaderProps {
  onComplete: () => void;
}

const STEPS = [
  { icon: Brain, text: 'Analyzing your responses...' },
  { icon: Sparkles, text: 'Identifying your collector traits...' },
  { icon: Target, text: 'Calculating your allocations...' },
  { icon: PieChart, text: 'Generating your profile...' },
];

export function AnalyzingLoader({ onComplete }: AnalyzingLoaderProps) {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const stepDuration = 750; // 3 seconds total for 4 steps
    
    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= STEPS.length - 1) {
          clearInterval(interval);
          setTimeout(onComplete, 500);
          return prev;
        }
        return prev + 1;
      });
    }, stepDuration);

    return () => clearInterval(interval);
  }, [onComplete]);

  const CurrentIcon = STEPS[currentStep].icon;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center min-h-[400px] space-y-8"
    >
      {/* Animated icon container */}
      <div className="relative">
        <motion.div
          animate={{ 
            scale: [1, 1.1, 1],
            rotate: [0, 5, -5, 0]
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/30"
        >
          <CurrentIcon className="w-12 h-12 text-primary-foreground" />
        </motion.div>
        
        {/* Orbiting particles */}
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-3 h-3 rounded-full bg-accent"
            animate={{
              rotate: 360,
            }}
            transition={{
              duration: 2 + i * 0.5,
              repeat: Infinity,
              ease: "linear",
            }}
            style={{
              top: '50%',
              left: '50%',
              transformOrigin: `${-30 - i * 15}px 0`,
            }}
          />
        ))}
      </div>

      {/* Loading text */}
      <motion.div
        key={currentStep}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="text-center space-y-2"
      >
        <p className="text-xl font-medium text-foreground">
          {STEPS[currentStep].text}
        </p>
        <div className="flex justify-center gap-2 pt-2">
          {STEPS.map((_, i) => (
            <motion.div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i <= currentStep ? 'bg-primary w-8' : 'bg-border w-4'
              }`}
            />
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
