import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { QuizPage } from '@/components/quiz/QuizPage';
import { EmailCapture } from '@/components/quiz/EmailCapture';
import { AnalyzingLoader } from '@/components/quiz/AnalyzingLoader';
import { QuizResults } from '@/components/quiz/QuizResults';
import { 
  QUIZ_QUESTIONS, 
  LikertValue, 
  Answers, 
  PersonalityResult,
  calculatePersonalityResult 
} from '@/lib/personalityEngine';
import { Seo } from '@/components/seo/Seo';

const QUESTIONS_PER_PAGE = 6;
const TOTAL_PAGES = Math.ceil(QUIZ_QUESTIONS.length / QUESTIONS_PER_PAGE);

type TestStage = 'quiz' | 'email' | 'analyzing' | 'results';

export default function PersonalityTest() {
  const [stage, setStage] = useState<TestStage>('quiz');
  const [currentPage, setCurrentPage] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [result, setResult] = useState<PersonalityResult | null>(null);
  const [userEmail, setUserEmail] = useState('');
  const [userGender, setUserGender] = useState('');

  const handleAnswer = useCallback((questionId: number, value: LikertValue) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  }, []);

  const handleNextPage = useCallback(() => {
    if (currentPage < TOTAL_PAGES - 1) {
      setCurrentPage(prev => prev + 1);
    } else {
      // Move to email capture
      setStage('email');
    }
  }, [currentPage]);

  const handlePrevPage = useCallback(() => {
    if (currentPage > 0) {
      setCurrentPage(prev => prev - 1);
    }
  }, [currentPage]);

  const handleEmailSubmit = useCallback((email: string, gender: string) => {
    setUserEmail(email);
    setUserGender(gender);
    setStage('analyzing');
  }, []);

  const handleAnalysisComplete = useCallback(() => {
    const calculatedResult = calculatePersonalityResult(answers);
    setResult(calculatedResult);
    setStage('results');
  }, [answers]);

  return (
    <>
      <Seo 
        title="Collector Personality Test | PokeIQ"
        description="Discover your Pokémon collector personality type with our free quiz. Find out if you're a Sentinel, Politician, Purist, Hustler, or Archivist."
      />
      
      <div className="min-h-screen bg-background">
        {/* Main Content */}
        <main className="max-w-2xl mx-auto px-4 py-8 md:py-12">
          {stage === 'quiz' && (
            <>
              {currentPage === 0 && (
                <div className="text-center mb-8 space-y-2">
                  <h1 className="text-3xl font-bold text-foreground">
                    Collector Personality Test
                  </h1>
                  <p className="text-muted-foreground">
                    Answer {QUIZ_QUESTIONS.length} quick questions to discover your collecting style.
                  </p>
                  <p className="text-sm text-muted-foreground/80 max-w-xl mx-auto pt-2">
                    In just 10 minutes, uncover the hidden psychology behind how you collect, spend, hold, chase, and connect with Pokémon.
                  </p>
                </div>
              )}
              <QuizPage
                currentPage={currentPage}
                answers={answers}
                onAnswer={handleAnswer}
                onNextPage={handleNextPage}
                onPrevPage={handlePrevPage}
                totalPages={TOTAL_PAGES}
              />
            </>
          )}

          {stage === 'email' && (
            <EmailCapture onSubmit={handleEmailSubmit} />
          )}

          {stage === 'analyzing' && (
            <AnalyzingLoader onComplete={handleAnalysisComplete} />
          )}

          {stage === 'results' && result && (
            <QuizResults result={result} />
          )}
        </main>

        {/* Footer */}
        <footer className="border-t border-border/50 py-6 mt-12">
          <div className="max-w-4xl mx-auto px-4 text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} PokeIQ. All rights reserved.
          </div>
        </footer>
      </div>
    </>
  );
}
