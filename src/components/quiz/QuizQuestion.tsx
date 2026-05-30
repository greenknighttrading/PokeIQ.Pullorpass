import React from 'react';
import { motion } from 'framer-motion';
import { QuizQuestion as QuizQuestionType, LikertValue } from '@/lib/personalityEngine';
import { cn } from '@/lib/utils';

interface QuizQuestionProps {
  question: QuizQuestionType;
  currentAnswer?: LikertValue;
  onAnswer: (questionId: number, value: LikertValue) => void;
  questionIndex: number;
}

const LIKERT_OPTIONS: { value: LikertValue; label: string; shortLabel: string }[] = [
  { value: 5, label: 'Strongly Agree', shortLabel: 'SA' },
  { value: 4, label: 'Agree', shortLabel: 'A' },
  { value: 3, label: 'Neutral', shortLabel: 'N' },
  { value: 2, label: 'Disagree', shortLabel: 'D' },
  { value: 1, label: 'Strongly Disagree', shortLabel: 'SD' },
];

export function QuizQuestion({ question, currentAnswer, onAnswer, questionIndex }: QuizQuestionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, delay: questionIndex * 0.05 }}
      className="space-y-4"
    >
      <div className="flex items-start gap-3">
        <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/10 text-primary font-semibold flex items-center justify-center text-sm">
          {question.id}
        </span>
        <p className="text-foreground text-base md:text-lg leading-relaxed pt-1">
          {question.text}
        </p>
      </div>
      
      <div className="flex gap-2 md:gap-3 justify-center pt-2">
        {LIKERT_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => onAnswer(question.id, option.value)}
            className={cn(
              "group relative flex flex-col items-center gap-1.5 px-3 py-3 md:px-4 md:py-4 rounded-xl border-2 transition-all duration-200",
              "min-w-[52px] md:min-w-[72px]",
              currentAnswer === option.value
                ? "border-primary bg-primary/15 shadow-md shadow-primary/20"
                : "border-border/50 bg-card/50 hover:border-primary/40 hover:bg-card"
            )}
          >
            <span 
              className={cn(
                "w-4 h-4 md:w-5 md:h-5 rounded-full border-2 transition-all",
                currentAnswer === option.value
                  ? "border-primary bg-primary"
                  : "border-muted-foreground/40 group-hover:border-primary/60"
              )}
            />
            <span className="text-[10px] md:text-xs font-medium text-muted-foreground whitespace-nowrap hidden md:block">
              {option.label}
            </span>
            <span className="text-[9px] font-medium text-muted-foreground md:hidden leading-tight text-center">
              {option.label}
            </span>
          </button>
        ))}
      </div>
    </motion.div>
  );
}
