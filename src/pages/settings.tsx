import { useState, useEffect, useRef } from "react";
import {
  Globe,
  Mail,
  MessageSquare,
  ExternalLink,
  Check,
  User,
  Eye,
  EyeOff,
  Save,
  Camera,
} from "lucide-react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/SupabaseAuthProvider";
import { useVideos } from "@/hooks/use-videos";

const languages = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "zh", name: "Chinese (Simplified)", nativeName: "简体中文" },
];

// Profile form schema
const profileSchema = z
  .object({
    firstName: z
      .string()
      .min(1, "First name is required")
      .max(50, "First name must be less than 50 characters"),
    lastName: z
      .string()
      .min(1, "Last name is required")
      .max(50, "Last name must be less than 50 characters"),
    username: z
      .string()
      .min(3, "Username must be at least 3 characters")
      .max(20, "Username must be less than 20 characters"),
    email: z.string().email("Please enter a valid email address"),
    avatar: z.string().optional(),
    newPassword: z.string().optional(),
    confirmPassword: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.newPassword && data.newPassword !== data.confirmPassword) {
        return false;
      }
      if (data.newPassword && data.newPassword.length < 6) {
        return false;
      }
      return true;
    },
    {
      message: "Password validation failed",
      path: ["newPassword"],
    },
  );

type ProfileFormData = z.infer<typeof profileSchema>;

// Translation object for UI elements
const translations = {
  en: {
    settings: "Settings",
    back: "Back",
    subtitle: "Customize your learning experience and preferences",

    // Profile section
    userProfile: "User Profile",
    profileDescription: "Manage your account information and security settings",
    avatar: "Profile Picture",
    changeAvatar: "Change Avatar",
    uploadNewAvatar: "Upload New Avatar",
    removeAvatar: "Remove Avatar",
    avatarUpdated: "Avatar updated successfully!",
    avatarRemoved: "Avatar removed successfully!",
    avatarUploadFailed: "Failed to upload avatar",
    supportedFormats: "Supported formats: JPG, PNG, GIF (max 5MB)",
    firstName: "First Name",
    lastName: "Last Name",
    username: "Username",
    email: "Email Address",
    changePassword: "Change Password",
    newPassword: "New Password",
    confirmPassword: "Confirm New Password",
    saveChanges: "Save Changes",
    savingChanges: "Saving...",
    profileUpdated: "Profile updated successfully!",
    profileUpdateFailed: "Failed to update profile",
    passwordRequired: "Enter current password to change password",
    passwordsNoMatch: "New passwords do not match",
    passwordTooShort: "Password must be at least 6 characters",

    languagePreferences: "Language Preferences",
    languageDescription:
      "Choose your preferred language for the user interface",
    uiLanguage: "User Interface Language",
    languageSaved: "Language preference saved!",
    supportFeedback: "Support & Feedback",
    supportDescription: "Get help or share your thoughts about Loud Mouth",
    developerContact: "Developer Contact",
    githubProfile: "GitHub Profile",
    emailContact: "Email Contact",
  },
  zh: {
    settings: "设置",
    back: "返回",
    subtitle: "自定义您的学习体验和偏好",

    // Profile section
    userProfile: "用户资料",
    profileDescription: "管理您的账户信息和安全设置",
    avatar: "头像",
    changeAvatar: "更换头像",
    uploadNewAvatar: "上传新头像",
    removeAvatar: "移除头像",
    avatarUpdated: "头像更新成功！",
    avatarRemoved: "头像移除成功！",
    avatarUploadFailed: "头像上传失败",
    supportedFormats: "支持格式：JPG、PNG、GIF（最大5MB）",
    firstName: "名",
    lastName: "姓",
    username: "用户名",
    email: "邮箱地址",
    changePassword: "修改密码",
    newPassword: "新密码",
    confirmPassword: "确认新密码",
    saveChanges: "保存更改",
    savingChanges: "保存中...",
    profileUpdated: "资料更新成功！",
    profileUpdateFailed: "资料更新失败",
    passwordRequired: "请输入当前密码以修改密码",
    passwordsNoMatch: "新密码不匹配",
    passwordTooShort: "密码至少需要6位字符",

    languagePreferences: "语言偏好",
    languageDescription: "选择您的用户界面首选语言",
    uiLanguage: "用户界面语言",
    languageSaved: "语言偏好已保存！",
    supportFeedback: "支持与反馈",
    supportDescription: "获取帮助或分享您对 Loud Mouth 的想法",
    developerContact: "开发者联系方式",
    githubProfile: "GitHub 主页",
    emailContact: "邮件联系",
  },
};

export default function Settings() {
  const [, setLocation] = useLocation();
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const { stats, isLoading, refreshVideos } = useVideos();
  const [activeSection, setActiveSection] = useState("settings");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isLanguageChanged, setIsLanguageChanged] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isProfileUpdating, setIsProfileUpdating] = useState(false);
  const [profileUpdateSuccess, setProfileUpdateSuccess] = useState(false);
  const [currentAvatar, setCurrentAvatar] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile form
  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      username: "",
      email: user?.email || "",
      avatar: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Update form when user data changes
  useEffect(() => {
    if (user) {
      profileForm.reset({
        firstName: "", // Demo user - would come from user data in real app
        lastName: "", // Demo user - would come from user data in real app
        username: "",
        email: user.email,
        avatar: "",
        newPassword: "",
        confirmPassword: "",
      });
    }
  }, [user, profileForm]);

  // Load language preference from localStorage on component mount
  useEffect(() => {
    const savedLanguage = localStorage.getItem("ui-language");
    if (
      savedLanguage &&
      languages.some((lang) => lang.code === savedLanguage)
    ) {
      setSelectedLanguage(savedLanguage);
    }
  }, []);

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
    setSelectedLanguage(languageCode);
    localStorage.setItem("ui-language", languageCode);
    setIsLanguageChanged(true);

    // Hide success message after 2 seconds
    setTimeout(() => {
      setIsLanguageChanged(false);
    }, 2000);
  };

  const handleGitHubProfile = () => {
    window.open("https://github.com/meatballG1210", "_blank");
  };

  const handleEmailContact = () => {
    window.open(
      "mailto:meatballg1210@gmail.com?subject=Loud%20Mouth%20Language%20Learning%20-%20Contact",
      "_blank",
    );
  };

  const handleAvatarUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: t.avatarUploadFailed,
        description: "Please select a valid image file (JPG, PNG, or GIF)",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: t.avatarUploadFailed,
        description: "File size must be less than 5MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingAvatar(true);
    try {
      // Convert file to base64 for demo purposes
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setCurrentAvatar(result);
        profileForm.setValue("avatar", result);

        toast({
          title: t.avatarUpdated,
          description: "Your profile picture has been updated",
        });

        setIsUploadingAvatar(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast({
        title: t.avatarUploadFailed,
        description: "Failed to upload avatar. Please try again.",
        variant: "destructive",
      });
      setIsUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = () => {
    setCurrentAvatar(null);
    profileForm.setValue("avatar", "");

    toast({
      title: t.avatarRemoved,
      description: "Your profile picture has been removed",
    });
  };

  const onProfileSubmit = async (data: ProfileFormData) => {
    setIsProfileUpdating(true);
    try {
      // Mock profile update - in real app this would call an API
      await new Promise((resolve) => setTimeout(resolve, 1500)); // Simulate API call

      // Validate password change if provided
      if (data.newPassword) {
        if (data.newPassword !== data.confirmPassword) {
          throw new Error(t.passwordsNoMatch);
        }
        if (data.newPassword.length < 6) {
          throw new Error(t.passwordTooShort);
        }
      }

      setProfileUpdateSuccess(true);

      toast({
        title: t.profileUpdated,
        description: "Your profile has been updated successfully.",
      });

      // Clear password fields after successful update
      profileForm.setValue("newPassword", "");
      profileForm.setValue("confirmPassword", "");

      // Hide success message after 3 seconds
      setTimeout(() => {
        setProfileUpdateSuccess(false);
      }, 3000);
    } catch (error: any) {
      toast({
        title: t.profileUpdateFailed,
        description:
          error.message || "An error occurred while updating your profile",
        variant: "destructive",
      });
    } finally {
      setIsProfileUpdating(false);
    }
  };

  const selectedLang = languages.find((lang) => lang.code === selectedLanguage);
  const t = translations[selectedLanguage as keyof typeof translations];

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
              <h1 className="text-2xl font-bold text-gray-900">{t.settings}</h1>
              <p className="text-sm text-gray-500 mt-1">{t.subtitle}</p>
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            <div className="p-6 space-y-6">
              {/* User Profile Section */}
              <Card className="border-gray-200 bg-white">
                <CardHeader>
                  <CardTitle className="text-gray-900 font-bold text-base flex items-center space-x-2">
                    <User className="w-5 h-5 text-blue-500" />
                    <span>{t.userProfile}</span>
                  </CardTitle>
                  <CardDescription className="text-gray-500">
                    {t.profileDescription}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...profileForm}>
                    <form
                      onSubmit={profileForm.handleSubmit(onProfileSubmit)}
                      className="space-y-6"
                    >
                      {/* Avatar Section */}
                      <div className="flex items-center space-x-6">
                        <div className="relative">
                          <div className="w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                            {currentAvatar ? (
                              <img
                                src={currentAvatar}
                                alt="Profile Avatar"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-white text-2xl font-bold">
                                {user?.email
                                  ? user.email.charAt(0).toUpperCase()
                                  : "U"}
                              </span>
                            )}
                          </div>
                          {isUploadingAvatar && (
                            <div className="absolute inset-0 rounded-full bg-black bg-opacity-50 flex items-center justify-center">
                              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            </div>
                          )}
                        </div>

                        <div className="flex-1">
                          <h4 className="text-sm font-medium text-gray-900 mb-2">
                            {t.avatar}
                          </h4>
                          <div className="flex flex-col sm:flex-row gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={handleAvatarUpload}
                              disabled={isUploadingAvatar}
                              className="flex items-center space-x-2"
                            >
                              <Camera className="w-4 h-4" />
                              <span>{t.uploadNewAvatar}</span>
                            </Button>

                            {currentAvatar && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleRemoveAvatar}
                                disabled={isUploadingAvatar}
                                className="text-red-600 border-red-200 hover:bg-red-50"
                              >
                                {t.removeAvatar}
                              </Button>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-2">
                            {t.supportedFormats}
                          </p>
                        </div>

                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/jpeg,image/jpg,image/png,image/gif"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </div>

                      <Separator />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={profileForm.control}
                          name="firstName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t.firstName}</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Enter first name"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={profileForm.control}
                          name="lastName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t.lastName}</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Enter last name"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={profileForm.control}
                          name="username"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t.username}</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Enter username"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={profileForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t.email}</FormLabel>
                              <FormControl>
                                <Input
                                  type="email"
                                  placeholder="Enter email address"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <Separator className="my-6" />

                      <div className="space-y-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <h4 className="text-sm font-semibold text-gray-900 flex items-center space-x-2">
                          <div className="w-1 h-4 bg-blue-500 rounded-full"></div>
                          <span>{t.changePassword}</span>
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={profileForm.control}
                            name="newPassword"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t.newPassword}</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <Input
                                      type={
                                        showNewPassword ? "text" : "password"
                                      }
                                      placeholder="Enter new password"
                                      {...field}
                                    />
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                      onClick={() =>
                                        setShowNewPassword(!showNewPassword)
                                      }
                                    >
                                      {showNewPassword ? (
                                        <EyeOff className="h-4 w-4" />
                                      ) : (
                                        <Eye className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={profileForm.control}
                            name="confirmPassword"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t.confirmPassword}</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <Input
                                      type={
                                        showConfirmPassword
                                          ? "text"
                                          : "password"
                                      }
                                      placeholder="Confirm new password"
                                      {...field}
                                    />
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                      onClick={() =>
                                        setShowConfirmPassword(
                                          !showConfirmPassword,
                                        )
                                      }
                                    >
                                      {showConfirmPassword ? (
                                        <EyeOff className="h-4 w-4" />
                                      ) : (
                                        <Eye className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4">
                        <div className="flex-1">
                          {profileUpdateSuccess && (
                            <div className="flex items-center space-x-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                              <Check className="w-4 h-4 text-green-600" />
                              <span className="text-sm text-green-700">
                                {t.profileUpdated}
                              </span>
                            </div>
                          )}
                        </div>

                        <Button
                          type="submit"
                          disabled={isProfileUpdating}
                          className="ml-4"
                        >
                          {isProfileUpdating ? (
                            <div className="flex items-center space-x-2">
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              <span>{t.savingChanges}</span>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2">
                              <Save className="w-4 h-4" />
                              <span>{t.saveChanges}</span>
                            </div>
                          )}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>

              <Separator />

              {/* Language Preferences Section */}
              <Card className="border-gray-200 bg-white">
                <CardHeader>
                  <CardTitle className="text-gray-900 font-bold text-base flex items-center space-x-2">
                    <Globe className="w-5 h-5 text-blue-500" />
                    <span>{t.languagePreferences}</span>
                  </CardTitle>
                  <CardDescription className="text-gray-500">
                    {t.languageDescription}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col space-y-2">
                    <Label
                      htmlFor="language-select"
                      className="text-gray-700 font-medium"
                    >
                      {t.uiLanguage}
                    </Label>
                    <Select
                      value={selectedLanguage}
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
                        {t.languageSaved}
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
                    <span>{t.supportFeedback}</span>
                  </CardTitle>
                  <CardDescription className="text-gray-500">
                    {t.supportDescription}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <h4 className="text-gray-900 font-medium">
                      {t.developerContact}
                    </h4>

                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button
                        onClick={handleGitHubProfile}
                        variant="outline"
                        className="flex items-center justify-center space-x-2"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>{t.githubProfile}</span>
                      </Button>

                      <Button
                        onClick={handleEmailContact}
                        variant="outline"
                        className="flex items-center justify-center space-x-2"
                      >
                        <Mail className="w-4 h-4" />
                        <span>{t.emailContact}</span>
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
