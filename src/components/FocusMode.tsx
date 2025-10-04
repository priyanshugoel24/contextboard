"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Target, CheckCircle2, Play, Pause, Timer, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { FocusModeProps } from "@/interfaces/ui-components";
import { focusModeConfig } from '@/config/focusMode';
import axios from "axios";

export default function FocusMode({ 
  cards, 
  open, 
  onClose, 
  workDuration = 25, 
  breakDuration = 5 
}: FocusModeProps) {
  // Filter to only show TASK-type cards
  const taskCards = cards.filter(card => card.type === 'TASK');
  
  // Track completed tasks during focus session (no localStorage)
  const [completed, setCompleted] = useState<string[]>([]);

  // Pomodoro timer state
  const [pomodoroPhase, setPomodoroPhase] = useState<"focus" | "break">("focus");
  const [pomodoroTimeLeft, setPomodoroTimeLeft] = useState(workDuration * 60);
  const [isPomodoroRunning, setIsPomodoroRunning] = useState(false);
  const pomodoroIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Per-task timers
  const [taskTimers, setTaskTimers] = useState<{ [cardId: string]: number }>({});
  const taskTimerRefs = useRef<{ [cardId: string]: NodeJS.Timeout }>({});

  // Session summary
  const [sessionEnded, setSessionEnded] = useState(false);
  const [totalFocusTime, setTotalFocusTime] = useState<number>(0);

  // Effect to reset session when modal opens
  useEffect(() => {
    if (open) {
      setCompleted([]); // Reset completed tasks for new session
      setSessionEnded(false);
      setTotalFocusTime(0);
      // Reset pomodoro to initial state
      setPomodoroPhase("focus");
      setPomodoroTimeLeft(workDuration * 60);
      setIsPomodoroRunning(false);
    } else {
      // Stop all timers when closing
      setIsPomodoroRunning(false);
      Object.keys(taskTimerRefs.current).forEach(stopTaskTimer);
    }
  }, [open, workDuration]);

  const handlePomodoroComplete = useCallback(() => {
    setIsPomodoroRunning(false);
    const isWorkSession = pomodoroPhase === "focus";
    toast.success(isWorkSession ? "Focus session complete! Take a break 🎉" : "Break over! Ready to focus again? 💪");
    
    if (isWorkSession) {
      setTotalFocusTime(prev => prev + (workDuration * 60));
    }
    
    setPomodoroPhase((prev) => (prev === "focus" ? "break" : "focus"));
    setPomodoroTimeLeft(isWorkSession ? breakDuration * 60 : workDuration * 60);
  }, [pomodoroPhase, workDuration, breakDuration]);

  // Pomodoro timer effect
  useEffect(() => {
    if (isPomodoroRunning) {
      pomodoroIntervalRef.current = setInterval(() => {
        setPomodoroTimeLeft((prev) => {
          if (prev <= 1) {
            handlePomodoroComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (pomodoroIntervalRef.current) clearInterval(pomodoroIntervalRef.current);
    }
    return () => {
      if (pomodoroIntervalRef.current) clearInterval(pomodoroIntervalRef.current);
    };
  }, [isPomodoroRunning, handlePomodoroComplete]);

  const startTaskTimer = (cardId: string) => {
    if (taskTimerRefs.current[cardId]) return;
    taskTimerRefs.current[cardId] = setInterval(() => {
      setTaskTimers((prev) => ({
        ...prev,
        [cardId]: (prev[cardId] || 0) + 1,
      }));
    }, 1000);
  };

  const stopTaskTimer = (cardId: string) => {
    if (taskTimerRefs.current[cardId]) {
      clearInterval(taskTimerRefs.current[cardId]);
      delete taskTimerRefs.current[cardId];
    }
  };

  const resetPomodoro = () => {
    setIsPomodoroRunning(false);
    setPomodoroPhase("focus");
    setPomodoroTimeLeft(workDuration * 60);
  };

  // Function to update completed tasks in database
  const updateCompletedTasksInDB = async (completedCardIds: string[]) => {
    if (completedCardIds.length === 0) return;

    try {
      // Update each completed card's status to CLOSED in the database
      const updatePromises = completedCardIds.map(async (cardId) => {
        const response = await axios.patch(`/api/context-cards/${cardId}`, {
          status: 'CLOSED'
        });

        return response.data;
      });

      await Promise.all(updatePromises);
      toast.success(`${completedCardIds.length} task(s) marked as completed! 🎉`);
    } catch (error) {
      console.error('Error updating completed tasks:', error);
      toast.error('Failed to save completed tasks to database');
    }
  };

  const endFocusSession = async () => {
    setIsPomodoroRunning(false);
    Object.keys(taskTimerRefs.current).forEach(stopTaskTimer);
    
    // Calculate actual focus time
    const focusTime = totalFocusTime + (isPomodoroRunning && pomodoroPhase === "focus" ? (workDuration * 60 - pomodoroTimeLeft) : 0);
    setTotalFocusTime(focusTime);
    
    // Update completed tasks in database
    if (completed.length > 0) {
      await updateCompletedTasksInDB(completed);
    }
    
    setSessionEnded(true);
  };

  const toggleComplete = (id: string) => {
    const wasCompleted = completed.includes(id);
    
    setCompleted((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );

    // Start/stop task timer based on completion
    if (!wasCompleted) {
      startTaskTimer(id);
    } else {
      stopTaskTimer(id);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const completedCount = completed.length;
  const totalCount = taskCards.length;
  const progressPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <>
      <Dialog open={open} onOpenChange={endFocusSession}>
        <DialogContent 
          fullscreen
          className="p-0 overflow-hidden flex flex-col"
          showCloseButton={false}
        >
          {/* Header with Pomodoro Timer */}
          <div className="relative bg-white dark:bg-slate-900/70 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 px-6 py-4 sm:px-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                  <Target className="w-6 h-6 text-white" />
                </div>
                <div>
                  <DialogTitle asChild>
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">Focus Mode</h2>
                  </DialogTitle>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {completedCount} of {totalCount} tasks completed
                  </p>
                </div>
              </div>

              {/* Pomodoro Timer */}
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className={`text-2xl font-mono font-bold ${pomodoroPhase === 'focus' ? 'text-blue-600 dark:text-blue-400' : 'text-green-600 dark:text-green-400'}`}>
                    {formatTime(pomodoroTimeLeft)}
                  </div>
                  <div className={`text-xs uppercase font-semibold tracking-wide ${pomodoroPhase === 'focus' ? 'text-blue-500 dark:text-blue-400' : 'text-green-500 dark:text-green-400'}`}>
                    {pomodoroPhase === 'focus' ? 'Focus' : 'Break'}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsPomodoroRunning(!isPomodoroRunning)}
                    className="w-8 h-8 p-0"
                  >
                    {isPomodoroRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={resetPomodoro}
                    className="w-8 h-8 p-0"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 mb-1">
                <span>Progress</span>
                <span>{Math.round(progressPercentage)}%</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
            <div className="max-w-7xl mx-auto w-full">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {taskCards.map((card) => {
                  const isCompleted = completed.includes(card.id);
                  const taskTime = taskTimers[card.id] || 0;
                  
                  return (
                    <div
                      key={card.id}
                      className={`group relative bg-white dark:bg-slate-800 rounded-xl border shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col ${
                        isCompleted 
                          ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20' 
                          : 'border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-600'
                      }`}
                    >
                      {/* Completion indicator */}
                      {isCompleted && (
                        <div className="absolute -top-2 -right-2 z-10">
                          <div className="bg-green-500 text-white rounded-full p-1 shadow-md">
                            <CheckCircle2 className="w-4 h-4" />
                          </div>
                        </div>
                      )}
                      
                      <div className="p-5 flex-1 flex flex-col">
                        <div className="flex items-start gap-4">
                          <Checkbox
                            checked={isCompleted}
                            onCheckedChange={() => toggleComplete(card.id)}
                            className="mt-1 flex-shrink-0 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                          />
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center justify-between">
                              <h3 className={`font-semibold text-slate-900 dark:text-slate-100 leading-tight ${
                                isCompleted ? 'line-through text-slate-500 dark:text-slate-400' : ''
                              }`}>
                                {card.title}
                              </h3>
                              {/* Task Timer */}
                              {(isCompleted || taskTime > 0) && (
                                <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-full">
                                  <Timer className="w-3 h-3" />
                                  {formatTime(taskTime)}
                                </div>
                              )}
                            </div>
                            <p className={`text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap leading-relaxed ${
                              isCompleted ? 'line-through opacity-60' : ''
                            }`}>
                              {card.content}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {taskCards.length === 0 && (
                <div className="text-center py-24">
                  <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Target className="w-10 h-10 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300">No Tasks for Focus Mode</h3>
                  <p className="text-slate-500 dark:text-slate-400 mt-2">Select some tasks from your board to start a focus session.</p>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm border-t border-slate-200 dark:border-slate-800 px-4 py-3 sm:px-6">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-sm text-slate-600 dark:text-slate-400 text-center sm:text-left">
                {completedCount === totalCount && totalCount > 0 ? (
                  <span className="text-green-600 dark:text-green-400 font-medium flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    All tasks completed! Great job!
                  </span>
                ) : (
                  <span>Keep going! You&apos;ve got this.</span>
                )}
              </div>
              <Button 
                variant="outline" 
                onClick={endFocusSession}
                className="bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border-slate-300 dark:border-slate-700 w-full sm:w-auto"
              >
                End Focus Mode
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Session Summary Modal */}
      <Dialog open={sessionEnded} onOpenChange={(open) => !open && (setSessionEnded(false), onClose())}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center flex items-center justify-center gap-2">
              🎉 Session Complete!
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="text-center space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {completedCount}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    Tasks Completed
                  </div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {formatTime(totalFocusTime)}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    Focus Time
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-4 rounded-lg">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {focusModeConfig.motivationalQuotes[Math.floor(Math.random() * focusModeConfig.motivationalQuotes.length)]}
                </p>
              </div>
            </div>

            <div className="flex justify-center">
              <Button onClick={() => (setSessionEnded(false), onClose())}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}