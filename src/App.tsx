import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/error-boundary";
import { LanguageProvider } from "@/components/LanguageProvider";
import { SupabaseAuthProvider, useAuth } from "@/components/SupabaseAuthProvider";
import { StudyTimeProvider } from "@/components/StudyTimeProvider";
import Login from "@/pages/login";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import ResetPasswordCode from "@/pages/reset-password-code";
import Home from "@/pages/home";
import VideoPlayer from "@/pages/video-player";
import UploadForm from "@/pages/upload-form";
import VocabularyList from "@/pages/vocabulary-list";
import VocabularyDetail from "@/pages/vocabulary-detail";
import VocabularyReview from "@/pages/vocabulary-review";
import Progress from "@/pages/progress";
import Settings from "@/pages/settings";
import NotFound from "@/pages/not-found";
import ErrorPage from "@/pages/error";
import ErrorTest from "@/pages/error-test";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();
  const [pathname] = useLocation();

  // Allow reset-password routes to be accessible even when not authenticated
  const isResetPasswordRoute = pathname === '/reset-password' || pathname === '/reset-password-code';

  if (isLoading && !isResetPasswordRoute) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || isResetPasswordRoute) {
    return (
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/reset-password" component={ResetPassword} />
        <Route path="/reset-password-code" component={ResetPasswordCode} />
        <Route path="/" component={Login} />
        <Route component={Login} />
      </Switch>
    );
  }

  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/video/:videoId" component={VideoPlayer} />
      <Route path="/upload" component={UploadForm} />
      <Route path="/vocabulary-list" component={VocabularyList} />
      <Route path="/vocabulary-list/:videoId" component={VocabularyDetail} />
      <Route path="/vocabulary-review" component={VocabularyReview} />
      <Route path="/vocabulary-review/session" component={VocabularyReview} />
      <Route path="/vocabulary-review/:videoId/session" component={VocabularyReview} />
      <Route path="/vocabulary-review/:videoId" component={VocabularyReview} />
      <Route path="/progress" component={Progress} />
      <Route path="/settings" component={Settings} />
      <Route path="/error" component={ErrorPage} />
      <Route path="/error-test" component={ErrorTest} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <QueryClientProvider client={queryClient}>
          <SupabaseAuthProvider>
            <StudyTimeProvider>
              <TooltipProvider>
                <Toaster />
                <div className="border-t border-gray-200">
                  <Router />
                </div>
              </TooltipProvider>
            </StudyTimeProvider>
          </SupabaseAuthProvider>
        </QueryClientProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
}

export default App;
