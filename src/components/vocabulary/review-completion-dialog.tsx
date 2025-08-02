import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Trophy } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

interface ReviewCompletionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReviewCompletionDialog({
  open,
  onOpenChange,
}: ReviewCompletionDialogProps) {
  const { t } = useLanguage();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <Trophy className="w-8 h-8 text-green-600" />
          </div>
          <DialogTitle className="text-2xl font-bold text-center">
            {t("reviewCompleted")}
          </DialogTitle>
          <DialogDescription className="text-center text-lg mt-2">
            {t("reviewCompletedMessage")}
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-center mt-6">
          <button
            onClick={() => onOpenChange(false)}
            className="px-8 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
          >
            {t("ok")}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}