import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Mail, Check } from "lucide-react";
import { WindowTitleBar } from "@/components/layout/window-titlebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/i18n";
import { z } from "zod";

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type ForgotPasswordData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPassword() {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  const form = useForm<ForgotPasswordData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (_: ForgotPasswordData) => {
    setIsLoading(true);
    try {
      // Mock forgot password request - in real app this would send email
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Simulate API call

      setIsSubmitted(true);

      toast({
        title: t("passwordResetSent"),
        description: t("checkEmailForInstructions"),
      });
    } catch (error: any) {
      toast({
        title: t("passwordResetFailed"),
        description: error.message || t("passwordResetError"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setLocation("/login");
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
        <WindowTitleBar title={t("passwordReset")} />

        <div className="flex-1 flex items-center justify-center p-6">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl font-bold">{t("emailSent")}</CardTitle>
              <CardDescription>{t("passwordResetEmailSent")}</CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
                <p className="text-blue-900 mb-2">{t("didntReceiveEmail")}</p>
                <ul className="text-blue-700 space-y-1 text-xs">
                  <li>• {t("checkSpamFolder")}</li>
                  <li>• {t("waitFewMinutes")}</li>
                  <li>• {t("tryDifferentEmail")}</li>
                </ul>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={() => setIsSubmitted(false)}
                  variant="outline"
                  className="w-full"
                >
                  {t("sendAnotherEmail")}
                </Button>

                <Button onClick={handleBackToLogin} variant="ghost" className="w-full">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  {t("backToLogin")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
      <WindowTitleBar title={t("forgotPassword")} />

      <div className="flex-1 flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-blue-600" />
            </div>
            <CardTitle className="text-2xl font-bold">{t("forgotPassword")}</CardTitle>
            <CardDescription>{t("forgotPasswordDescription")}</CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("email")}</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder={t("enterEmailForReset")}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>{t("sendingReset")}</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Mail className="w-4 h-4" />
                      <span>{t("sendResetLink")}</span>
                    </div>
                  )}
                </Button>
              </form>
            </Form>

            <div className="text-center">
              <Button variant="ghost" onClick={handleBackToLogin} className="text-sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t("backToLogin")}
              </Button>
            </div>

            {/* Demo notice */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm">
              <p className="font-medium text-yellow-900 mb-1">{t("demoNotice")}</p>
              <p className="text-yellow-700 text-xs">{t("demoPasswordResetNotice")}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
