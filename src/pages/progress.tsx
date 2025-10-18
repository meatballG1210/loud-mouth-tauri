import { useState, useEffect } from "react";
import { Clock, Target, BookOpen, Activity, Settings } from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { Sidebar } from "@/components/layout/sidebar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useLocation } from "wouter";
import { useLanguage } from "@/lib/i18n";
import { useVideos } from "@/hooks/use-videos";
import { useVocabulary } from "@/hooks/use-vocabulary";
import { useStudyTime } from "@/hooks/use-study-time";
import { vocabularyApi } from "@/api/vocabulary";
import { useQuery } from "@tanstack/react-query";

// Default user ID for local-only app without authentication
const DEFAULT_USER_ID = "default-user";

// Default weekly goal in hours
const DEFAULT_WEEKLY_GOAL = 8;

// Calculate day streak from vocabulary review data
function calculateDayStreak(vocabulary: any[]): number {
  if (!vocabulary || vocabulary.length === 0) return 0;

  // Get all review dates
  const reviewDates = vocabulary
    .filter((item) => item.lastReviewed)
    .map((item) => {
      const date = new Date(item.lastReviewed);
      return date.toDateString();
    })
    .filter((date, index, self) => self.indexOf(date) === index) // unique dates
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime()); // newest first

  if (reviewDates.length === 0) return 0;

  // Check if today or yesterday has reviews
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();

  if (reviewDates[0] !== today && reviewDates[0] !== yesterday) {
    return 0; // Streak is broken
  }

  // Count consecutive days
  let streak = 0;
  let currentDate = new Date();

  for (let i = 0; i < 365; i++) {
    // max 365 days
    const dateStr = currentDate.toDateString();
    if (reviewDates.includes(dateStr)) {
      streak++;
    } else if (streak > 0) {
      // Streak is broken
      break;
    }
    currentDate = new Date(currentDate.getTime() - 86400000); // go back one day
  }

  return streak;
}

// Calculate average accuracy from vocabulary review data
function calculateAverageAccuracy(vocabulary: any[]): number {
  if (!vocabulary || vocabulary.length === 0) return 0;

  // Calculate accuracy using real data if available
  const reviewedItems = vocabulary.filter((item) => item.review_count > 0);

  if (reviewedItems.length === 0) return 0; // No reviews yet, show 0%

  let totalCorrect = 0;
  let totalAttempts = 0;

  reviewedItems.forEach((item) => {
    const reviews = item.review_count || 0;
    const correct = item.correct_count || 0;

    totalAttempts += reviews;
    totalCorrect += correct;
  });

  if (totalAttempts === 0) return 0;

  return Math.round((totalCorrect / totalAttempts) * 100); // Round to integer
}

// Calculate vocabulary growth over time
function calculateVocabularyGrowth(vocabulary: any[]): any[] {
  if (!vocabulary || vocabulary.length === 0) return [];

  // Group vocabulary by creation date
  const growthMap = new Map<string, number>();

  // Sort vocabulary by creation date
  const sortedVocab = [...vocabulary].sort((a, b) => {
    const dateA = new Date(a.lastReviewed || Date.now());
    const dateB = new Date(b.lastReviewed || Date.now());
    return dateA.getTime() - dateB.getTime();
  });

  // Calculate cumulative growth
  const growthData: any[] = [];

  sortedVocab.forEach((item) => {
    const date = new Date(item.lastReviewed || Date.now());
    const dateStr = date.toISOString().split("T")[0];

    if (!growthMap.has(dateStr)) {
      growthMap.set(dateStr, 0);
    }
    growthMap.set(dateStr, growthMap.get(dateStr)! + 1);
  });

  // Convert to array format for chart
  let runningTotal = 0;
  Array.from(growthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([date, count]) => {
      runningTotal += count;
      growthData.push({
        date,
        total: runningTotal,
        new: count,
      });
    });

  // If we have data, ensure we show at least the last 6 data points
  if (growthData.length > 6) {
    return growthData.slice(-6);
  }

  return growthData;
}

// Calculate accuracy trend over time
function calculateAccuracyTrend(vocabulary: any[]): any[] {
  if (!vocabulary || vocabulary.length === 0) return [];

  // Group reviews by date and calculate daily accuracy
  const dailyWords = new Map<string, any[]>();

  // Group vocabulary by last reviewed date
  vocabulary.forEach((item) => {
    if (item.review_count > 0 && item.lastReviewed) {
      const date = new Date(item.lastReviewed).toISOString().split("T")[0];

      if (!dailyWords.has(date)) {
        dailyWords.set(date, []);
      }

      dailyWords.get(date)!.push(item);
    }
  });

  // Calculate accuracy for each day
  const trendData = Array.from(dailyWords.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, words]) => {
      let totalCorrect = 0;
      let totalAttempts = 0;

      words.forEach((item) => {
        const reviews = item.review_count || 0;
        const correct = item.correct_count || 0;

        totalCorrect += correct;
        totalAttempts += reviews;
      });

      return {
        date,
        accuracy:
          totalAttempts > 0
            ? Math.round((totalCorrect / totalAttempts) * 100)
            : 100,
      };
    });

  // If we have data, ensure we show at least the last 6 data points
  if (trendData.length > 6) {
    return trendData.slice(-6);
  }

  return trendData;
}

export default function Progress() {
  const [activeTab, setActiveTab] = useState("overview");
  const [weeklyGoal, setWeeklyGoal] = useState(() => {
    // Load saved goal from localStorage
    const saved = localStorage.getItem("weekly_study_goal");
    return saved ? parseFloat(saved) : DEFAULT_WEEKLY_GOAL;
  });
  const [newGoal, setNewGoal] = useState(() => {
    const saved = localStorage.getItem("weekly_study_goal");
    return saved || DEFAULT_WEEKLY_GOAL.toString();
  });
  const [isGoalDialogOpen, setIsGoalDialogOpen] = useState(false);
  const [, setLocation] = useLocation();
  const { t } = useLanguage();
  const { stats, isLoading, refreshVideos, videos } = useVideos();
  const { vocabulary } = useVocabulary(videos);
  const {
    stats: studyTimeStats,
    getWeeklyStudyData,
    updateDayWordCount,
    isTracking,
    forceEndSession,
  } = useStudyTime();
  const [activeSection, setActiveSection] = useState("progress");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Fetch real accuracy stats from backend
  const { data: accuracyStats, refetch: refetchAccuracyStats } = useQuery({
    queryKey: ["accuracy-stats"],
    queryFn: async () => {
      const stats = await vocabularyApi.getAccuracyStats(DEFAULT_USER_ID);
      return stats;
    },
    enabled: !!vocabulary.length, // Only fetch if we have vocabulary
    refetchOnWindowFocus: true, // Refetch when window gains focus
    staleTime: 0, // Always fetch fresh data
  });

  // Refetch accuracy stats when component mounts or vocabulary changes
  useEffect(() => {
    if (vocabulary.length > 0) {
      refetchAccuracyStats();
    }
  }, [vocabulary.length, refetchAccuracyStats]);

  const handleSaveGoal = () => {
    const goalValue = parseFloat(newGoal);
    if (goalValue > 0 && goalValue <= 168) {
      // Max 168 hours per week
      setWeeklyGoal(goalValue);
      localStorage.setItem("weekly_study_goal", goalValue.toString());
      setIsGoalDialogOpen(false);
    }
  };

  const handleNavigate = (section: string) => {
    if (section === "vocabulary") {
      setLocation("/vocabulary-list");
    } else if (section === "reviews") {
      setLocation("/vocabulary-review");
    } else if (section === "progress") {
      setActiveSection("progress");
      setLocation("/progress");
    } else if (section === "settings") {
      setLocation("/settings");
    } else if (section === "videos") {
      setLocation("/");
    } else {
      setActiveSection(section);
    }
  };

  const handleUploadVideo = () => {
    setLocation("/upload");
  };

  const handleViewModeChange = (mode: "grid" | "list") => {
    setViewMode(mode);
  };

  // Calculate real-time statistics
  const currentStreak = calculateDayStreak(vocabulary);
  // Use backend accuracy stats if available, otherwise calculate from frontend data
  const averageAccuracy =
    accuracyStats?.accuracy_percentage ?? calculateAverageAccuracy(vocabulary);
  const vocabularyGrowth = calculateVocabularyGrowth(vocabulary);
  const accuracyTrend = calculateAccuracyTrend(vocabulary);

  // Update word counts for each day
  useEffect(() => {
    const wordsByDay = new Map<string, number>();

    vocabulary.forEach((item) => {
      const date = new Date(item.lastReviewed || Date.now());
      const dateStr = date.toISOString().split("T")[0];
      wordsByDay.set(dateStr, (wordsByDay.get(dateStr) || 0) + 1);
    });

    // Update today's word count
    const today = new Date().toISOString().split("T")[0];
    const todayWords = wordsByDay.get(today) || 0;
    if (todayWords > 0) {
      updateDayWordCount(today, todayWords);
    }
  }, [vocabulary, updateDayWordCount]);

  // Get weekly study data with word counts
  const weeklyStudyData = getWeeklyStudyData().map((day) => {
    // Count words added on this day
    const dayWords = vocabulary.filter((item) => {
      const itemDate = new Date(item.lastReviewed || Date.now());
      return itemDate.toISOString().split("T")[0] === day.date;
    }).length;

    return {
      ...day,
      words: dayWords,
    };
  });

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden select-none">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          stats={stats}
          activeSection={activeSection}
          onNavigate={handleNavigate}
          onUploadVideo={handleUploadVideo}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
          onRefresh={refreshVideos}
          isLoading={isLoading}
        />

        <div className="flex-1 flex flex-col bg-white overflow-hidden">
          {/* Content Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-white">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {t("progressTitle")}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {t("progressSubtitle")}
              </p>
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            <div className="p-6 space-y-6">
              {/* Key Statistics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border-gray-200 bg-white">
                  <div className="p-4">
                    <div className="flex items-center space-x-3">
                      <BookOpen className="w-8 h-8 text-blue-500" />
                      <div>
                        <p className="text-2xl font-bold text-gray-900">
                          {stats.totalVocabulary}
                        </p>
                        <p className="text-sm text-gray-500">
                          {t("totalWords")}
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>

                <Card className="border-gray-200 bg-white relative">
                  <div className="p-4">
                    <div className="flex items-center space-x-3">
                      <Clock className="w-8 h-8 text-green-500" />
                      <div>
                        <p className="text-2xl font-bold text-gray-900">
                          {studyTimeStats.totalHours}h
                        </p>
                        <p className="text-sm text-gray-500">
                          {t("studyTime")}
                        </p>
                      </div>
                    </div>
                    {isTracking && (
                      <div className="absolute top-2 right-2 flex items-center space-x-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        <span className="text-xs text-green-600">
                          {t("tracking")}
                        </span>
                      </div>
                    )}
                  </div>
                </Card>

                <Card className="border-gray-200 bg-white">
                  <div className="p-4">
                    <div className="flex items-center space-x-3">
                      <Activity className="w-8 h-8 text-orange-500" />
                      <div>
                        <p className="text-2xl font-bold text-gray-900">
                          {currentStreak}
                        </p>
                        <p className="text-sm text-gray-500">
                          {t("dayStreak")}
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>

                <Card className="border-gray-200 bg-white">
                  <div className="p-4">
                    <div className="flex items-center space-x-3">
                      <Target className="w-8 h-8 text-purple-500" />
                      <div>
                        <p className="text-2xl font-bold text-gray-900">
                          {averageAccuracy}%
                        </p>
                        <p className="text-sm text-gray-500">{t("accuracy")}</p>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Detailed Analytics Tabs */}
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-3 bg-gray-100">
                  <TabsTrigger
                    value="overview"
                    className="text-gray-700 data-[state=active]:bg-white"
                  >
                    {t("overview")}
                  </TabsTrigger>
                  <TabsTrigger
                    value="vocabulary"
                    className="text-gray-700 data-[state=active]:bg-white"
                  >
                    {t("vocabularyProgress")}
                  </TabsTrigger>
                  <TabsTrigger
                    value="performance"
                    className="text-gray-700 data-[state=active]:bg-white"
                  >
                    {t("performance")}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                  {/* Weekly Goal Progress */}
                  <Card className="border-gray-200 bg-white">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-gray-900 font-bold text-base">
                            {t("weeklyGoal")}
                          </CardTitle>
                          <CardDescription className="text-gray-500">
                            {studyTimeStats.weeklyHours} of {weeklyGoal}{" "}
                            {t("hoursThisWeek")}
                          </CardDescription>
                        </div>
                        <Dialog
                          open={isGoalDialogOpen}
                          onOpenChange={setIsGoalDialogOpen}
                        >
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex items-center space-x-1"
                            >
                              <Settings className="w-4 h-4" />
                              <span className="text-xs">{t("setGoal")}</span>
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                              <DialogTitle>{t("setWeeklyGoal")}</DialogTitle>
                              <DialogDescription>
                                {t("chooseHours")}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                              <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="goal" className="text-right">
                                  {t("hoursPerWeek")}
                                </Label>
                                <Input
                                  id="goal"
                                  type="number"
                                  min="0.5"
                                  max="168"
                                  step="0.5"
                                  value={newGoal}
                                  onChange={(e) => setNewGoal(e.target.value)}
                                  className="col-span-3"
                                  placeholder="8.0"
                                />
                              </div>
                              <p className="text-xs text-gray-500">
                                {t("recommendedHours")}
                              </p>
                            </div>
                            <DialogFooter>
                              <Button
                                variant="outline"
                                onClick={() => setIsGoalDialogOpen(false)}
                              >
                                {t("cancel")}
                              </Button>
                              <Button onClick={handleSaveGoal}>
                                {t("save")}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                        <div
                          className="bg-blue-500 h-3 rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min((studyTimeStats.weeklyHours / weeklyGoal) * 100, 100)}%`,
                          }}
                        />
                      </div>
                      <div className="flex justify-between text-sm text-gray-500">
                        <span>
                          {studyTimeStats.weeklyHours}h {t("completed")}
                        </span>
                        <span>
                          {Math.max(
                            weeklyGoal - studyTimeStats.weeklyHours,
                            0,
                          ).toFixed(1)}
                          h {t("remaining")}
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Daily Study Chart */}
                  <Card className="border-gray-200 bg-white">
                    <CardHeader>
                      <CardTitle className="text-gray-900 font-bold">
                        {t("dailyStudyTime")}
                      </CardTitle>
                      <CardDescription className="text-gray-500">
                        {t("thisWeek")}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={weeklyStudyData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="day" />
                            <YAxis />
                            <Tooltip
                              labelFormatter={(label) => t(`day${label}`)}
                              formatter={(value, name) => [
                                `${value} ${name === "minutes" ? t("minutes") : t("words")}`,
                                name === "minutes"
                                  ? t("studyTime")
                                  : t("wordsLearned"),
                              ]}
                            />
                            <Bar
                              dataKey="minutes"
                              fill="#3B82F6"
                              name="minutes"
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="vocabulary" className="space-y-6">
                  {/* Vocabulary Growth Chart */}
                  <Card className="border-gray-200 bg-white">
                    <CardHeader>
                      <CardTitle className="text-gray-900 font-bold">
                        {t("vocabularyGrowth")}
                      </CardTitle>
                      <CardDescription className="text-gray-500">
                        {t("totalWordsOverTime")}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={vocabularyGrowth}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip
                              labelFormatter={(label) =>
                                new Date(label).toLocaleDateString()
                              }
                              formatter={(value, name) => [
                                value,
                                name === "total"
                                  ? t("totalWords")
                                  : t("newWords"),
                              ]}
                            />
                            <Area
                              type="monotone"
                              dataKey="total"
                              stroke="#10B981"
                              fill="#10B981"
                              fillOpacity={0.2}
                              strokeWidth={3}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="performance" className="space-y-6">
                  {/* Accuracy Trend */}
                  <Card className="border-gray-200 bg-white">
                    <CardHeader>
                      <CardTitle className="text-gray-900 font-bold">
                        {t("accuracyTrend")}
                      </CardTitle>
                      <CardDescription className="text-gray-500">
                        {t("reviewAccuracyOverTime")}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={accuracyTrend}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis domain={[0, 100]} />
                            <Tooltip
                              labelFormatter={(label) =>
                                new Date(label).toLocaleDateString()
                              }
                              formatter={(value) => [
                                `${value}%`,
                                t("accuracy"),
                              ]}
                            />
                            <Line
                              type="monotone"
                              dataKey="accuracy"
                              stroke="#F59E0B"
                              strokeWidth={3}
                              dot={{ fill: "#F59E0B", strokeWidth: 2, r: 4 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
