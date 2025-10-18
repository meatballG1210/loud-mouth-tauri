import { useState, useEffect } from "react";
import {
  Globe,
  Mail,
  MessageSquare,
  ExternalLink,
  Check,
} from "lucide-react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useLocation } from "wouter";
import { Sidebar } from "@/components/layout/sidebar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useVideos } from "@/hooks/use-videos";
import { useLanguage } from "@/lib/i18n";

const languages = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "zh", name: "Chinese (Simplified)", nativeName: "简体中文" },
];

export default function Settings() {
  const [, setLocation] = useLocation();
  const { language, setLanguage, t } = useLanguage();
  const { stats, isLoading, refreshVideos } = useVideos();
  const [activeSection, setActiveSection] = useState("settings");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isLanguageChanged, setIsLanguageChanged] = useState(false);
  const { toast } = useToast();

  const handleNavigate = (section: string) => {
    console.log("Navigate to:", section);
    if (section === "vocabulary") {
      setLocation("/vocabulary-list");
    } else if (section === "reviews") {
      setLocation("/vocabulary-review");
    } else if (section === "progress") {
      setLocation("/progress");
    } else if (section === "settings") {
      setActiveSection("settings");
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

  const handleLanguageChange = (languageCode: string) => {
    setLanguage(languageCode as "en" | "zh");
    setIsLanguageChanged(true);

    // Hide success message after 2 seconds
    setTimeout(() => {
      setIsLanguageChanged(false);
    }, 2000);
  };

  const handleGitHubProfile = async () => {
    try {
      await openUrl("https://github.com/meatballG1210");
    } catch (error) {
      console.error("Failed to open GitHub profile:", error);
      toast({
        title: "Failed to open link",
        description: "Could not open GitHub profile in your browser",
        variant: "destructive",
      });
    }
  };

  const handleEmailContact = async () => {
    try {
      await openUrl(
        "mailto:meatballg1210@gmail.com?subject=Loud%20Mouth%20Language%20Learning%20-%20Contact"
      );
    } catch (error) {
      console.error("Failed to open email client:", error);
      toast({
        title: "Failed to open email",
        description: "Could not open your email client",
        variant: "destructive",
      });
    }
  };

  const selectedLang = languages.find((lang) => lang.code === language);

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
              <h1 className="text-2xl font-bold text-gray-900">{t('settings')}</h1>
              <p className="text-sm text-gray-500 mt-1">{t('settingsSubtitle')}</p>
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            <div className="p-6 space-y-6">
              {/* Language Preferences Section */}
              <Card className="border-gray-200 bg-white">
                <CardHeader>
                  <CardTitle className="text-gray-900 font-bold text-base flex items-center space-x-2">
                    <Globe className="w-5 h-5 text-blue-500" />
                    <span>{t('languagePreferences')}</span>
                  </CardTitle>
                  <CardDescription className="text-gray-500">
                    {t('languageDescription')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col space-y-2">
                    <Label
                      htmlFor="language-select"
                      className="text-gray-700 font-medium"
                    >
                      {t('uiLanguage')}
                    </Label>
                    <Select
                      value={language}
                      onValueChange={handleLanguageChange}
                    >
                      <SelectTrigger className="w-full max-w-xs">
                        <SelectValue>
                          {selectedLang
                            ? `${selectedLang.nativeName} (${selectedLang.name})`
                            : "Select language"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {languages.map((language) => (
                          <SelectItem key={language.code} value={language.code}>
                            {language.nativeName} ({language.name})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {isLanguageChanged && (
                    <div className="flex items-center space-x-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <Check className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-green-700">
                        {t('languageSaved')}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Separator />

              {/* Support & Feedback Section */}
              <Card className="border-gray-200 bg-white">
                <CardHeader>
                  <CardTitle className="text-gray-900 font-bold text-base flex items-center space-x-2">
                    <MessageSquare className="w-5 h-5 text-green-500" />
                    <span>{t('supportFeedback')}</span>
                  </CardTitle>
                  <CardDescription className="text-gray-500">
                    {t('supportDescription')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <h4 className="text-gray-900 font-medium">
                      {t('developerContact')}
                    </h4>

                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button
                        onClick={handleGitHubProfile}
                        variant="outline"
                        className="flex items-center justify-center space-x-2"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>{t('githubProfile')}</span>
                      </Button>

                      <Button
                        onClick={handleEmailContact}
                        variant="outline"
                        className="flex items-center justify-center space-x-2"
                      >
                        <Mail className="w-4 h-4" />
                        <span>{t('emailContact')}</span>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
