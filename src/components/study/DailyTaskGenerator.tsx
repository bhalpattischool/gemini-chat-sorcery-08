
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Calendar, Clock, BookOpen, AlertTriangle, CheckCircle, CalendarDays } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { addPointsToUser } from '@/utils/points';
import { useToast } from '@/hooks/use-toast';
import StudyTimer from './StudyTimer';

interface Task {
  id: string;
  subject: string;
  name: string;
  duration: number; // In minutes
  completed: boolean;
  scheduled: Date;
  missed: boolean;
}

const DailyTaskGenerator: React.FC = () => {
  const [examName, setExamName] = useState('');
  const [examDate, setExamDate] = useState('');
  const [subjects, setSubjects] = useState<{name: string, chapters: number}[]>([
    { name: 'गणित', chapters: 10 },
    { name: 'विज्ञान', chapters: 8 },
  ]);
  const [dailyHours, setDailyHours] = useState(2);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showPlanSetup, setShowPlanSetup] = useState(true);
  const { currentUser } = useAuth();
  const { toast } = useToast();
  
  // Load tasks from localStorage on mount
  useEffect(() => {
    if (currentUser) {
      const savedTasks = localStorage.getItem(`${currentUser.uid}_study_tasks`);
      const savedPlan = localStorage.getItem(`${currentUser.uid}_study_plan`);
      
      if (savedTasks) {
        try {
          const parsedTasks = JSON.parse(savedTasks);
          setTasks(parsedTasks);
        } catch (error) {
          console.error('Error parsing saved tasks:', error);
        }
      }
      
      if (savedPlan) {
        try {
          const parsedPlan = JSON.parse(savedPlan);
          setExamName(parsedPlan.examName || '');
          setExamDate(parsedPlan.examDate || '');
          setDailyHours(parsedPlan.dailyHours || 2);
          setSubjects(parsedPlan.subjects || [
            { name: 'गणित', chapters: 10 },
            { name: 'विज्ञान', chapters: 8 },
          ]);
          setShowPlanSetup(false);
        } catch (error) {
          console.error('Error parsing saved plan:', error);
        }
      }
    }
  }, [currentUser]);
  
  // Save tasks to localStorage when they change
  useEffect(() => {
    if (currentUser && tasks.length > 0) {
      localStorage.setItem(`${currentUser.uid}_study_tasks`, JSON.stringify(tasks));
    }
  }, [tasks, currentUser]);
  
  // Check for missed tasks daily
  useEffect(() => {
    const checkMissedTasks = () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const updatedTasks = tasks.map(task => {
        const taskDate = new Date(task.scheduled);
        taskDate.setHours(0, 0, 0, 0);
        
        // Mark as missed if it was scheduled before today and isn't completed
        if (taskDate < today && !task.completed) {
          return { ...task, missed: true };
        }
        
        return task;
      });
      
      if (JSON.stringify(updatedTasks) !== JSON.stringify(tasks)) {
        setTasks(updatedTasks);
      }
    };
    
    checkMissedTasks();
    
    // Check daily at midnight
    const interval = setInterval(checkMissedTasks, 86400000); // 24 hours
    
    return () => clearInterval(interval);
  }, [tasks]);
  
  const generateStudyPlan = () => {
    if (!examName || !examDate || subjects.length === 0 || dailyHours <= 0) {
      toast({
        title: "Missing Information",
        description: "Please fill all fields to generate your study plan.",
        variant: "destructive"
      });
      return;
    }
    
    // Save plan details
    const planDetails = {
      examName,
      examDate,
      dailyHours,
      subjects
    };
    
    if (currentUser) {
      localStorage.setItem(`${currentUser.uid}_study_plan`, JSON.stringify(planDetails));
    }
    
    // Calculate days left until exam
    const today = new Date();
    const examDay = new Date(examDate);
    const daysLeft = Math.max(1, Math.ceil((examDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
    
    // Generate new tasks based on days left and subjects
    const newTasks: Task[] = [];
    let taskId = 1;
    
    // Distribute days across subjects
    subjects.forEach(subject => {
      const daysForSubject = Math.max(1, Math.floor(daysLeft * (subject.chapters / subjects.reduce((sum, s) => sum + s.chapters, 0))));
      
      for (let i = 0; i < daysForSubject && i < subject.chapters; i++) {
        const taskDate = new Date();
        taskDate.setDate(today.getDate() + Math.floor(i * (daysLeft / daysForSubject)));
        
        newTasks.push({
          id: `task-${taskId++}`,
          subject: subject.name,
          name: `अध्याय ${i + 1}`,
          duration: Math.floor((dailyHours * 60) / subjects.length), // Convert hours to minutes
          completed: false,
          scheduled: taskDate,
          missed: false
        });
      }
    });
    
    // Sort tasks by scheduled date
    newTasks.sort((a, b) => new Date(a.scheduled).getTime() - new Date(b.scheduled).getTime());
    
    setTasks(newTasks);
    setShowPlanSetup(false);
    
    toast({
      title: "अध्ययन योजना तैयार!",
      description: `${daysLeft} दिनों के लिए ${newTasks.length} कार्य जनरेट किए गए हैं`
    });
    
    // Award points for creating a study plan
    if (currentUser) {
      addPointsToUser(
        currentUser.uid,
        5,
        'activity',
        'अध्ययन योजना बनाई'
      );
    }
  };
  
  const handleTaskCompletion = (taskId: string) => {
    setTasks(prevTasks => 
      prevTasks.map(task => 
        task.id === taskId ? { ...task, completed: true } : task
      )
    );
    
    // Check if completing this creates a streak
    if (currentUser) {
      // Logic for streaks
      const completedTasksCount = tasks.filter(t => t.completed).length + 1; // +1 for current task
      
      if (completedTasksCount % 3 === 0) {
        // Award bonus points for completing 3 tasks
        addPointsToUser(
          currentUser.uid,
          7,
          'streak',
          `${completedTasksCount} कार्य पूरे किए - स्ट्रीक बोनस!`
        );
        
        toast({
          title: "स्ट्रीक बोनस!",
          description: `${completedTasksCount} कार्य पूरे करने के लिए 7 अतिरिक्त XP मिले!`
        });
      }
    }
  };
  
  const markTaskMissed = (taskId: string) => {
    setTasks(prevTasks => 
      prevTasks.map(task => 
        task.id === taskId ? { ...task, missed: true } : task
      )
    );
  };
  
  const getTodaysTasks = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return tasks.filter(task => {
      const taskDate = new Date(task.scheduled);
      taskDate.setHours(0, 0, 0, 0);
      return taskDate.getTime() === today.getTime() && !task.completed;
    });
  };
  
  const getMissedTasks = () => {
    return tasks.filter(task => task.missed && !task.completed);
  };
  
  const getUpcomingTasks = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return tasks.filter(task => {
      const taskDate = new Date(task.scheduled);
      taskDate.setHours(0, 0, 0, 0);
      return taskDate > today && !task.completed;
    }).slice(0, 3); // Show next 3 upcoming tasks
  };
  
  // Format date for display
  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('hi-IN', { 
      day: 'numeric', 
      month: 'short'
    });
  };
  
  const resetPlan = () => {
    setShowPlanSetup(true);
    if (currentUser) {
      localStorage.removeItem(`${currentUser.uid}_study_tasks`);
      // Keep the plan details for editing
    }
  };
  
  return (
    <div className="space-y-6">
      {showPlanSetup ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-800 dark:text-purple-300">
              <CalendarDays className="h-5 w-5" />
              अध्ययन योजना बनाएं
            </CardTitle>
            <CardDescription>
              अपने परीक्षा के अनुसार दैनिक अध्ययन टास्क जनरेट करें
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="examName">परीक्षा का नाम</Label>
              <Input 
                id="examName" 
                value={examName} 
                onChange={(e) => setExamName(e.target.value)}
                placeholder="जैसे: बोर्ड परीक्षा, प्रवेश परीक्षा, आदि"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="examDate">परीक्षा की तारीख</Label>
              <Input 
                id="examDate" 
                type="date" 
                value={examDate} 
                onChange={(e) => setExamDate(e.target.value)} 
              />
            </div>
            
            <div className="space-y-2">
              <Label>विषय और अध्याय (अपडेट करें)</Label>
              <div className="space-y-3">
                {subjects.map((subject, index) => (
                  <div key={index} className="flex gap-2">
                    <Input 
                      value={subject.name} 
                      onChange={(e) => {
                        const newSubjects = [...subjects];
                        newSubjects[index].name = e.target.value;
                        setSubjects(newSubjects);
                      }} 
                      placeholder="विषय का नाम"
                      className="flex-1"
                    />
                    <Input 
                      type="number" 
                      value={subject.chapters} 
                      onChange={(e) => {
                        const newSubjects = [...subjects];
                        newSubjects[index].chapters = parseInt(e.target.value) || 1;
                        setSubjects(newSubjects);
                      }} 
                      placeholder="अध्याय" 
                      min="1"
                      className="w-20"
                    />
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => {
                        setSubjects(subjects.filter((_, i) => i !== index));
                      }}
                      className="shrink-0"
                    >
                      ✕
                    </Button>
                  </div>
                ))}
              </div>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setSubjects([...subjects, { name: '', chapters: 5 }])}
                className="mt-2"
              >
                विषय जोड़ें
              </Button>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="dailyHours">दैनिक अध्ययन समय (घंटे)</Label>
              <Input 
                id="dailyHours" 
                type="number" 
                value={dailyHours} 
                onChange={(e) => setDailyHours(parseInt(e.target.value) || 1)} 
                min="1" 
                max="12"
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={generateStudyPlan}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
            >
              अध्ययन योजना जनरेट करें
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-purple-800 dark:text-purple-300">
              {examName} - अध्ययन योजना
            </h2>
            <Button variant="outline" size="sm" onClick={resetPlan}>
              योजना एडिट करें
            </Button>
          </div>
          
          {getTodaysTasks().length > 0 ? (
            <div className="space-y-4">
              <h3 className="font-medium flex items-center gap-2 text-purple-700 dark:text-purple-300">
                <Clock className="h-4 w-4" />
                आज का अध्ययन कार्य
              </h3>
              
              {getTodaysTasks().map(task => (
                <StudyTimer 
                  key={task.id}
                  taskName={task.name}
                  taskSubject={task.subject}
                  taskDuration={task.duration}
                  taskId={task.id}
                  onComplete={() => handleTaskCompletion(task.id)}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <CheckCircle className="h-12 w-12 text-green-500 mb-3" />
                  <h3 className="text-lg font-medium">आज के सभी कार्य पूरे हो गए हैं!</h3>
                  <p className="text-gray-500 mt-1">अपनी मेहनत के लिए बधाई!</p>
                </div>
              </CardContent>
            </Card>
          )}
          
          {getMissedTasks().length > 0 && (
            <div className="space-y-4">
              <h3 className="font-medium flex items-center gap-2 text-orange-600 dark:text-orange-400">
                <AlertTriangle className="h-4 w-4" />
                पिछले छूटे हुए कार्य
              </h3>
              
              {getMissedTasks().map(task => (
                <Card key={task.id} className="border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-900/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-orange-600" />
                        <span>{task.subject}</span>
                      </div>
                      <span className="text-xs text-orange-600">{formatDate(task.scheduled)}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 pb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{task.name}</h4>
                        <p className="text-sm text-orange-600/80">{task.duration} मिनट</p>
                      </div>
                      <Button 
                        size="sm" 
                        variant="default"
                        className="bg-orange-600 hover:bg-orange-700"
                        onClick={() => markTaskMissed(task.id)}
                      >
                        अभी पूरा करें
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          
          {getUpcomingTasks().length > 0 && (
            <div className="space-y-4">
              <h3 className="font-medium flex items-center gap-2 text-blue-600 dark:text-blue-400">
                <Calendar className="h-4 w-4" />
                आगामी अध्ययन कार्य
              </h3>
              
              <Card className="border-blue-100 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/20">
                <CardContent className="pt-4">
                  <ul className="space-y-3 divide-y divide-blue-100 dark:divide-blue-800/30">
                    {getUpcomingTasks().map(task => (
                      <li key={task.id} className="pt-3 first:pt-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="bg-blue-100 dark:bg-blue-800/50 text-blue-700 dark:text-blue-300 text-xs px-2 py-1 rounded">
                              {formatDate(task.scheduled)}
                            </span>
                            <span className="font-medium">{task.subject}</span>
                          </div>
                          <span className="text-sm text-blue-600/80">{task.name}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DailyTaskGenerator;
