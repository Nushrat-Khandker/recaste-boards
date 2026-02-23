import { Image, FileVideo, FileAudio, FileText, FileSpreadsheet, Presentation, File, LucideIcon } from 'lucide-react';

export const isImageFile = (fileName: string | null, fileUrl: string | null): boolean => {
  if (!fileName && !fileUrl) return false;
  const name = (fileName || fileUrl || '').toLowerCase();
  return /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i.test(name);
};

export const isVideoFile = (fileName: string | null, fileUrl: string | null): boolean => {
  if (!fileName && !fileUrl) return false;
  const name = (fileName || fileUrl || '').toLowerCase();
  return /\.(mp4|webm|mov|avi|mkv|flv|wmv)$/i.test(name);
};

export const isAudioFile = (fileName: string | null, fileUrl: string | null): boolean => {
  if (!fileName && !fileUrl) return false;
  const name = (fileName || fileUrl || '').toLowerCase();
  return /\.(mp3|wav|ogg|m4a|aac|flac|wma)$/i.test(name);
};

export const isDocumentFile = (fileName: string | null, fileUrl: string | null): boolean => {
  if (!fileName && !fileUrl) return false;
  const name = (fileName || fileUrl || '').toLowerCase();
  return /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|csv|rtf|odt|ods|odp)$/i.test(name);
};

export const isPdfFile = (fileName: string | null, fileUrl: string | null): boolean => {
  if (!fileName && !fileUrl) return false;
  const name = (fileName || fileUrl || '').toLowerCase();
  return /\.pdf$/i.test(name);
};

export interface FileTypeInfo {
  icon: LucideIcon;
  label: string;
  color: string;
}

export const getFileTypeInfo = (fileName: string | null, fileUrl: string | null): FileTypeInfo => {
  const name = (fileName || fileUrl || '').toLowerCase();

  if (isImageFile(fileName, fileUrl)) return { icon: Image, label: 'Image', color: 'text-green-500' };
  if (isVideoFile(fileName, fileUrl)) return { icon: FileVideo, label: 'Video', color: 'text-blue-500' };
  if (isAudioFile(fileName, fileUrl)) return { icon: FileAudio, label: 'Audio', color: 'text-purple-500' };
  if (/\.pdf$/i.test(name)) return { icon: FileText, label: 'PDF', color: 'text-red-500' };
  if (/\.(doc|docx|rtf|odt|txt)$/i.test(name)) return { icon: FileText, label: 'Document', color: 'text-blue-600' };
  if (/\.(xls|xlsx|csv|ods)$/i.test(name)) return { icon: FileSpreadsheet, label: 'Spreadsheet', color: 'text-green-600' };
  if (/\.(ppt|pptx|odp)$/i.test(name)) return { icon: Presentation, label: 'Presentation', color: 'text-orange-500' };
  
  return { icon: File, label: 'File', color: 'text-muted-foreground' };
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

export const getFileExtension = (fileName: string | null): string => {
  if (!fileName) return '';
  const parts = fileName.split('.');
  return parts.length > 1 ? parts.pop()!.toUpperCase() : '';
};
