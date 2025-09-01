import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { AlertCircle, Mic, Volume2, WifiOff } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

export type SpeechErrorType = 
  | "no-audio"
  | "no-speech"
  | "recognition-failed"
  | "repetitive-text"
  | "audio-format"
  | "permission-denied"
  | "general";

interface SpeechRecognitionErrorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  errorType: SpeechErrorType;
  errorMessage?: string;
  onRetry?: () => void;
}

export function SpeechRecognitionErrorDialog({
  open,
  onOpenChange,
  errorType,
  errorMessage,
  onRetry,
}: SpeechRecognitionErrorDialogProps) {
  const { t } = useLanguage();

  const getErrorContent = () => {
    switch (errorType) {
      case "no-audio":
        return {
          icon: <Volume2 className="w-8 h-8 text-red-600" />,
          title: t("speechError.noAudio.title"),
          description: t("speechError.noAudio.description"),
        };
      case "no-speech":
        return {
          icon: <Mic className="w-8 h-8 text-red-600" />,
          title: t("speechError.noSpeech.title"),
          description: t("speechError.noSpeech.description"),
        };
      case "recognition-failed":
        return {
          icon: <AlertCircle className="w-8 h-8 text-red-600" />,
          title: t("speechError.recognitionFailed.title"),
          description: t("speechError.recognitionFailed.description"),
        };
      case "repetitive-text":
        return {
          icon: <AlertCircle className="w-8 h-8 text-red-600" />,
          title: t("speechError.repetitiveText.title"),
          description: t("speechError.repetitiveText.description"),
        };
      case "audio-format":
        return {
          icon: <AlertCircle className="w-8 h-8 text-red-600" />,
          title: t("speechError.audioFormat.title"),
          description: t("speechError.audioFormat.description"),
        };
      case "permission-denied":
        return {
          icon: <Mic className="w-8 h-8 text-red-600" />,
          title: t("speechError.permissionDenied.title"),
          description: t("speechError.permissionDenied.description"),
        };
      default:
        return {
          icon: <WifiOff className="w-8 h-8 text-red-600" />,
          title: t("speechError.general.title"),
          description: errorMessage || t("speechError.general.description"),
        };
    }
  };

  const content = getErrorContent();

  const handleAction = () => {
    onOpenChange(false);
    if (onRetry) {
      // Small delay before retry to ensure dialog is closed
      setTimeout(() => {
        onRetry();
      }, 200);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex flex-col items-center text-center space-y-3">
            {/* Error Icon Container */}
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              {content.icon}
            </div>
            
            {/* Title */}
            <AlertDialogTitle className="text-xl font-semibold text-gray-900">
              {content.title}
            </AlertDialogTitle>
            
            {/* Description */}
            <AlertDialogDescription className="text-gray-600 text-base leading-relaxed">
              {content.description}
            </AlertDialogDescription>
          </div>
        </AlertDialogHeader>
        
        <AlertDialogFooter className="mt-6">
          <AlertDialogAction
            onClick={handleAction}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2.5 rounded-lg transition-colors"
          >
            {onRetry ? t("tryAgain") : t("ok")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}