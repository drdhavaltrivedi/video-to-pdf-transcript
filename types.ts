
export interface TranscriptSegment {
  timestamp: string;
  speaker: string;
  text: string;
  tone: string;
  intent: string;
}

export interface VideoMetadata {
  title: string;
  speakerName: string;
  category: string;
  language: string;
  tags: string[];
  summary: string;
}

export interface TrainingData {
  metadata: VideoMetadata;
  transcript: TranscriptSegment[];
}

export enum ProcessingState {
  IDLE = 'IDLE',
  PREPARING = 'PREPARING',
  UPLOADING = 'UPLOADING',
  ANALYZING = 'ANALYZING',
  INDEXING = 'INDEXING',
  GENERATING_PDF = 'GENERATING_PDF',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}
