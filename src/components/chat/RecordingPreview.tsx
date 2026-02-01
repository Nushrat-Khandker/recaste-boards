import { Button } from '@/components/ui/button';

interface RecordingPreviewProps {
  recordedBlob: Blob;
  recordingType: 'audio' | 'video';
  onSend: () => void;
  onCancel: () => void;
}

export const RecordingPreview = ({
  recordedBlob,
  recordingType,
  onSend,
  onCancel,
}: RecordingPreviewProps) => {
  const blobUrl = URL.createObjectURL(recordedBlob);

  return (
    <div className="px-4 py-3 bg-muted border-b">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm">
            {recordingType === 'video' ? '🎥' : '🎤'} Recording ready
          </span>
          {recordingType === 'audio' && (
            <audio src={blobUrl} controls className="h-8" />
          )}
          {recordingType === 'video' && (
            <video src={blobUrl} controls className="h-20" />
          )}
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={onSend}>Send</Button>
          <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
        </div>
      </div>
    </div>
  );
};
