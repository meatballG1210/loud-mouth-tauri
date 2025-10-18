import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/error-boundary";
import { LanguageProvider } from "@/components/LanguageProvider";
import { StudyTimeProvider } from "@/components/StudyTimeProvider";
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
          <StudyTimeProvider>
            <TooltipProvider>
              <Toaster />
              <div className="border-t border-gray-200">
                <Router />
              </div>
            </TooltipProvider>
          </StudyTimeProvider>
        </QueryClientProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
}

export default App;
