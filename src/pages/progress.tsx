import { useState } from "react";
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
import { WindowTitleBar } from "@/components/layout/window-titlebar";
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

// Mock data for progress tracking
const mockLearningStats = {
  totalLearningTime: 142, // hours
  totalVocabulary: 387,
  activeDays: 28,
  currentStreak: 7,
  longestStreak: 14,
  weeklyTimeGoal: 8, // hours per week
  weeklyTimeProgress: 5.5, // hours this week
  averageAccuracy: 85.2,
  bestDay: {
    date: "2025-06-05",
    wordsLearned: 23,
    accuracy: 94.1,
  },
};

const mockVocabularyGrowth = [
  { date: "2025-05-01", total: 250, new: 0 },
  { date: "2025-05-08", total: 270, new: 20 },
  { date: "2025-05-15", total: 295, new: 25 },
  { date: "2025-05-22", total: 325, new: 30 },
  { date: "2025-05-29", total: 350, new: 25 },
  { date: "2025-06-05", total: 387, new: 37 },
];

const mockDailyStudy = [
  { day: "Mon", minutes: 45, words: 8 },
  { day: "Tue", minutes: 62, words: 12 },
  { day: "Wed", minutes: 38, words: 6 },
  { day: "Thu", minutes: 55, words: 10 },
  { day: "Fri", minutes: 71, words: 15 },
  { day: "Sat", minutes: 89, words: 18 },
  { day: "Sun", minutes: 43, words: 7 },
];

const mockAccuracyTrend = [
  { date: "2025-05-01", accuracy: 72.3 },
  { date: "2025-05-08", accuracy: 76.8 },
  { date: "2025-05-15", accuracy: 81.2 },
  { date: "2025-05-22", accuracy: 83.7 },
  { date: "2025-05-29", accuracy: 84.9 },
  { date: "2025-06-05", accuracy: 85.2 },
];

export default function Progress() {
  const [activeTab, setActiveTab] = useState("overview");
  const [weeklyGoal, setWeeklyGoal] = useState(mockLearningStats.weeklyTimeGoal);
  const [newGoal, setNewGoal] = useState(mockLearningStats.weeklyTimeGoal.toString());
  const [isGoalDialogOpen, setIsGoalDialogOpen] = useState(false);
  const [, setLocation] = useLocation();
  const { t } = useLanguage();
  const { stats, isLoading, refreshVideos } = useVideos();
  const [activeSection, setActiveSection] = useState("progress");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const handleSaveGoal = () => {
    const goalValue = parseFloat(newGoal);
    if (goalValue > 0 && goalValue <= 168) {
      // Max 168 hours per week
      setWeeklyGoal(goalValue);
      setIsGoalDialogOpen(false);
    }
  };

  const handleNavigate = (section: string) => {
    console.log("Navigate to:", section);
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
    console.log("Upload video clicked");
    setLocation("/upload");
  };

  const handleViewModeChange = (mode: "grid" | "list") => {
    setViewMode(mode);
    console.log("View mode changed to:", mode);
  };

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden select-none">
      <WindowTitleBar title={t("progress")} />

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
              <h1 className="text-2xl font-bold text-gray-900">{t("progressTitle")}</h1>
              <p className="text-sm text-gray-500 mt-1">{t("progressSubtitle")}</p>
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
                          {mockLearningStats.totalVocabulary}
                        </p>
                        <p className="text-sm text-gray-500">{t("totalWords")}</p>
                      </div>
                    </div>
                  </div>
                </Card>

                <Card className="border-gray-200 bg-white">
                  <div className="p-4">
                    <div className="flex items-center space-x-3">
                      <Clock className="w-8 h-8 text-green-500" />
                      <div>
                        <p className="text-2xl font-bold text-gray-900">
                          {mockLearningStats.totalLearningTime}h
                        </p>
                        <p className="text-sm text-gray-500">{t("studyTime")}</p>
                      </div>
                    </div>
                  </div>
                </Card>

                <Card className="border-gray-200 bg-white">
                  <div className="p-4">
                    <div className="flex items-center space-x-3">
                      <Activity className="w-8 h-8 text-orange-500" />
                      <div>
                        <p className="text-2xl font-bold text-gray-900">
                          {mockLearningStats.currentStreak}
                        </p>
                        <p className="text-sm text-gray-500">{t("dayStreak")}</p>
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
                          {mockLearningStats.averageAccuracy}%
                        </p>
                        <p className="text-sm text-gray-500">{t("accuracy")}</p>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Detailed Analytics Tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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
                            {mockLearningStats.weeklyTimeProgress} of {weeklyGoal}{" "}
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
                              <DialogDescription>{t("chooseHours")}</DialogDescription>
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
                              <Button onClick={handleSaveGoal}>{t("save")}</Button>
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
                            width: `${Math.min((mockLearningStats.weeklyTimeProgress / weeklyGoal) * 100, 100)}%`,
                          }}
                        />
                      </div>
                      <div className="flex justify-between text-sm text-gray-500">
                        <span>
                          {mockLearningStats.weeklyTimeProgress}h {t("completed")}
                        </span>
                        <span>
                          {Math.max(weeklyGoal - mockLearningStats.weeklyTimeProgress, 0)}
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
                          <BarChart data={mockDailyStudy}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="day" />
                            <YAxis />
                            <Tooltip
                              labelFormatter={(label) => t(`day${label}`)}
                              formatter={(value, name) => [
                                `${value} ${name === "minutes" ? t("minutes") : t("words")}`,
                                name === "minutes" ? t("studyTime") : t("wordsLearned"),
                              ]}
                            />
                            <Bar dataKey="minutes" fill="#3B82F6" name="minutes" />
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
                          <AreaChart data={mockVocabularyGrowth}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip
                              labelFormatter={(label) =>
                                new Date(label).toLocaleDateString()
                              }
                              formatter={(value, name) => [
                                value,
                                name === "total" ? t("totalWords") : t("newWords"),
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
                          <LineChart data={mockAccuracyTrend}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis domain={[0, 100]} />
                            <Tooltip
                              labelFormatter={(label) =>
                                new Date(label).toLocaleDateString()
                              }
                              formatter={(value) => [`${value}%`, t("accuracy")]}
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
