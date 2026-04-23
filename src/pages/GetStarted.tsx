import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, PieChart, ChevronRight, Sparkles, TrendingUp } from 'lucide-react';
import { FeedbackDialog } from '@/components/feedback/FeedbackDialog';

export default function GetStarted() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Nav */}
      <div className="w-full border-b border-border bg-background/95 backdrop-blur-sm p-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-primary" />
            </div>
            <span className="font-semibold text-sm">PokeIQ</span>
          </div>
          <FeedbackDialog />
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-2xl w-full space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Welcome to PokeIQ!</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Choose how you'd like to get started with your collection journey.
          </p>
        </motion.div>

        {/* Options */}
        <div className="grid md:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Link to="/home" className="block h-full">
              <Card className="p-6 h-full hover:border-primary/50 transition-colors cursor-pointer group">
                <div className="flex flex-col h-full">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <Upload className="w-6 h-6 text-primary" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground mb-2">Portfolio Review</h2>
                  <p className="text-muted-foreground text-sm flex-1">
                    You can upload Collectr Export or CSV file to get personalized insights, health score, and rebalancing suggestions based on your actual collection.
                  </p>
                  <div className="mt-4 flex items-center text-primary text-sm font-medium">
                    Get Started
                    <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Card>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Link to="/simulator" className="block h-full">
              <Card className="p-6 h-full hover:border-accent/50 transition-colors cursor-pointer group">
                <div className="flex flex-col h-full">
                  <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4 group-hover:bg-accent/20 transition-colors">
                    <PieChart className="w-6 h-6 text-accent" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground mb-2">Portfolio Simulator</h2>
                  <p className="text-muted-foreground text-sm flex-1">
                    Plan and simulate your ideal collection allocation. No data upload required.
                  </p>
                  <div className="mt-4 flex items-center text-accent text-sm font-medium">
                    Start Planning
                    <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Card>
            </Link>
          </motion.div>
        </div>

        {/* Personality test banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="p-4 bg-secondary/50 border-border">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-primary" />
                <p className="text-sm text-muted-foreground">
                  Haven't taken the personality test yet?
                </p>
              </div>
              <Link to="/test">
                <Button variant="outline" size="sm">
                  Take the Test
                </Button>
              </Link>
            </div>
          </Card>
        </motion.div>
        </div>
      </div>
    </div>
  );
}
