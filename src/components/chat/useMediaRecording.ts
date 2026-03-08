import { useState, useRef, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';

// iOS Safari doesn't support audio/webm — use mp4 fallback
const getPreferredMimeType = (type: 'audio' | 'video'): string => {
  if (type === 'video') {
    if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) return 'video/webm;codecs=vp9';
    if (MediaRecorder.isTypeSupported('video/webm')) return 'video/webm';
    if (MediaRecorder.isTypeSupported('video/mp4')) return 'video/mp4';
    return '';
  }
  if (MediaRecorder.isTypeSupported('audio/webm')) return 'audio/webm';
  if (MediaRecorder.isTypeSupported('audio/mp4')) return 'audio/mp4';
  if (MediaRecorder.isTypeSupported('audio/aac')) return 'audio/aac';
  return '';
};

const getFileExtension = (mimeType: string): string => {
  if (mimeType.includes('webm')) return 'webm';
  if (mimeType.includes('mp4')) return 'mp4';
  if (mimeType.includes('aac')) return 'aac';
  return 'dat';
};

export const useMediaRecording = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingType, setRecordingType] = useState<'audio' | 'video' | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedMimeType, setRecordedMimeType] = useState<string>('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();

  // CRITICAL: This must be called directly from a click handler for iOS Safari
  const startRecording = useCallback(async (type: 'audio' | 'video') => {
    try {
      // getUserMedia called directly in the click handler context
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
        video: type === 'video' ? { facingMode: 'user' } : false,
      });

      streamRef.current = stream;

      const mimeType = getPreferredMimeType(type);
      setRecordedMimeType(mimeType);

      const options: MediaRecorderOptions = {};
      if (mimeType) options.mimeType = mimeType;

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      recordedChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const actualMime = mimeType || (type === 'video' ? 'video/webm' : 'audio/webm');
        const blob = new Blob(recordedChunksRef.current, { type: actualMime });
        
        streamRef.current?.getTracks().forEach(track => track.stop());
        streamRef.current = null;
        setRecordedBlob(blob);
      };

      // Collect data every second for more reliable recording on iOS
      mediaRecorder.start(1000);
      setIsRecording(true);
      setRecordingType(type);

      toast({
        title: 'Recording started',
        description: `${type === 'video' ? 'Video' : 'Audio'} recording in progress`,
      });
    } catch (error: any) {
      console.error('Error starting recording:', error);
      const description = error?.name === 'NotAllowedError'
        ? 'Microphone/camera access denied. Please check your browser permissions.'
        : 'Failed to start recording. Please check your permissions.';
      toast({
        title: 'Error',
        description,
        variant: 'destructive',
      });
    }
  }, [toast]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  const clearRecording = useCallback(() => {
    setRecordedBlob(null);
    setRecordingType(null);
    setRecordedMimeType('');
  }, []);

  const getRecordingExtension = useCallback(() => {
    return getFileExtension(recordedMimeType);
  }, [recordedMimeType]);

  return {
    isRecording,
    recordingType,
    recordedBlob,
    startRecording,
    stopRecording,
    clearRecording,
    getRecordingExtension,
  };
};
