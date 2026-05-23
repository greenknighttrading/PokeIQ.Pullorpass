import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QuizQuestion as QuizQuestionComponent } from './QuizQuestion';
import { QUIZ_QUESTIONS, LikertValue, Answers } from '@/lib/personalityEngine';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface QuizPageProps {
  currentPage: number;
  answers: Answers;
  onAnswer: (questionId: number, value: LikertValue) => void;
  onNextPage: () => void;
  onPrevPage: () => void;
  totalPages: number;
}

const QUESTIONS_PER_PAGE = 6;

export function QuizPage({ 
  currentPage, 
  answers, 
  onAnswer, 
  onNextPage, 
  onPrevPage,
  totalPages 
}: QuizPageProps) {
  const startIdx = currentPage * QUESTIONS_PER_PAGE;
  const endIdx = startIdx + QUESTIONS_PER_PAGE;
  const pageQuestions = QUIZ_QUESTIONS.slice(startIdx, endIdx);
  
  const totalQuestions = QUIZ_QUESTIONS.length;
  const answeredCount = Object.keys(answers).length;
  const progressPercent = (answeredCount / totalQuestions) * 100;
  
  // Check if all questions on this page are answered
  const pageAnswered = pageQuestions.every(q => answers[q.id] !== undefined);
  
  // Handle answer with auto-advance
  const handleAnswer = (questionId: number, value: LikertValue) => {
    onAnswer(questionId, value);
  };

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Section {currentPage + 1} of {totalPages}</span>
          <span>{answeredCount} of {totalQuestions} answered</span>
        </div>
        <Progress value={progressPercent} className="h-2" />
      </div>
      
      {/* Questions */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentPage}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="space-y-8"
        >
          {pageQuestions.map((question, idx) => (
            <QuizQuestionComponent
              key={question.id}
              question={question}
              currentAnswer={answers[question.id]}
              onAnswer={handleAnswer}
              questionIndex={idx}
            />
          ))}
        </motion.div>
      </AnimatePresence>
      
      {/* Navigation */}
      <div className="flex justify-between pt-6 border-t border-border/50">
        <Button
          variant="ghost"
          onClick={onPrevPage}
          disabled={currentPage === 0}
          className="gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </Button>
        
        <Button
          onClick={onNextPage}
          disabled={!pageAnswered}
          className="gap-2"
        >
          {currentPage === totalPages - 1 ? 'Complete' : 'Next'}
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
