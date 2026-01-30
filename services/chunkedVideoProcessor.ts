import { processVideoWithGemini } from "./geminiService";
import { TrainingData } from "../types";
import { 
  shouldChunkVideo, 
  splitVideoIntoChunks, 
  chunkToBase64,
  VideoChunk,
  ChunkingProgress 
} from "../utils/videoChunker";
import { mergeTranscripts, removeBoundaryDuplicates } from "../utils/transcriptMerger";

export interface ChunkedProcessingOptions {
  chunkDurationMinutes?: number;
  onChunkProgress?: (progress: ChunkingProgress) => void;
  onChunkComplete?: (chunkIndex: number, totalChunks: number) => void;
}

/**
 * Process video with automatic chunking for large videos
 */
export const processVideoWithChunking = async (
  file: File,
  userMetadata: { title: string; speakerName: string; category: string },
  options: ChunkedProcessingOptions = {}
): Promise<TrainingData> => {
  const { 
    chunkDurationMinutes = 15,
    onChunkProgress,
    onChunkComplete 
  } = options;

  // Check if video needs chunking
  const needsChunking = await shouldChunkVideo(file, 100, 60); // 100MB or 60 minutes
  
  if (!needsChunking) {
    // Process normally for smaller videos
    const reader = new FileReader();
    const base64Promise = new Promise<string>((resolve, reject) => {
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const base64 = await base64Promise;
    return await processVideoWithGemini(base64, file.type, userMetadata);
  }

  // Process with chunking
  console.log('Video is large, processing in chunks...');
  
  // Split video into chunks
  onChunkProgress?.({
    currentChunk: 0,
    totalChunks: 0,
    progress: 0,
    status: 'Preparing video chunks...'
  });

  const chunks = await splitVideoIntoChunks(file, chunkDurationMinutes, onChunkProgress);
  const totalChunks = chunks.length;
  
  console.log(`Processing ${totalChunks} chunks...`);

  // Process each chunk
  const chunkResults: TrainingData[] = [];
  const chunkDurations: number[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    
    onChunkProgress?.({
      currentChunk: i + 1,
      totalChunks,
      progress: ((i + 1) / totalChunks) * 100,
      status: `Processing chunk ${i + 1} of ${totalChunks}...`
    });

    try {
      // Convert chunk to base64
      // Note: For actual video splitting, we'd need FFmpeg.wasm
      // For now, we'll process the full video but this structure allows for chunking
      const base64 = await chunkToBase64(chunk);
      
      // Process chunk with metadata indicating it's a segment
      const chunkMetadata = {
        ...userMetadata,
        title: `${userMetadata.title} (Segment ${i + 1}/${totalChunks})`
      };
      
      const result = await processVideoWithGemini(base64, file.type, chunkMetadata);
      chunkResults.push(result);
      chunkDurations.push(chunk.duration);
      
      onChunkComplete?.(i + 1, totalChunks);
      
      // Small delay between chunks to avoid rate limiting
      if (i < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(`Error processing chunk ${i + 1}:`, error);
      // Continue with other chunks even if one fails
      // Add empty result to maintain indexing
      chunkResults.push({
        metadata: {
          title: userMetadata.title,
          speakerName: userMetadata.speakerName,
          category: userMetadata.category,
          language: 'Unknown',
          tags: [],
          summary: `Chunk ${i + 1} processing failed`
        },
        transcript: []
      });
      chunkDurations.push(chunk.duration);
    }
  }

  // Merge all chunk results
  onChunkProgress?.({
    currentChunk: totalChunks,
    totalChunks,
    progress: 100,
    status: 'Merging transcripts...'
  });

  const merged = mergeTranscripts(chunkResults, chunkDurations);
  
  // Clean up duplicate segments at boundaries
  merged.transcript = removeBoundaryDuplicates(merged.transcript);

  return merged;
};

