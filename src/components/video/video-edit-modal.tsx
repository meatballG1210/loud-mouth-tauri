import { useState, useEffect } from 'react';
import { Video } from '@/types/video';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/lib/i18n';

interface VideoEditModalProps {
  video: Video | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (videoId: string, newTitle: string) => Promise<void>;
}

export function VideoEditModal({
  video,
  isOpen,
  onClose,
  onSave,
}: VideoEditModalProps) {
  const { t } = useLanguage();
  const [title, setTitle] = useState(video?.title || '');
  const [isLoading, setIsLoading] = useState(false);

  // Update title when video changes
  useEffect(() => {
    setTitle(video?.title || '');
  }, [video]);

  const handleSave = async () => {
    if (!video || !title.trim()) return;

    setIsLoading(true);
    try {
      await onSave(video.id, title.trim());
      onClose();
    } catch (error) {
      console.error('Error saving video:', error);
      alert(t('failedToUpdateTitle'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('editVideoInformation')}</DialogTitle>
          <DialogDescription>
            {t('editVideoDescription')}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="title" className="text-right">
              {t('titleLabel')}
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="col-span-3"
              placeholder={t('enterVideoTitle')}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            {t('cancel')}
          </Button>
          <Button onClick={handleSave} disabled={isLoading || !title.trim()}>
            {isLoading ? t('saving') : t('saveChanges')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}