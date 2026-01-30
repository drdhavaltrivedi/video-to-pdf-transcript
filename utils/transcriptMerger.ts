import { TrainingData, TranscriptSegment } from "../types";

/**
 * Merge multiple transcript chunks into a single transcript
 */
export const mergeTranscripts = (
  chunks: TrainingData[],
  chunkDurations: number[] // duration in seconds for each chunk
): TrainingData => {
  if (chunks.length === 0) {
    throw new Error('No chunks to merge');
  }

  // Use the first chunk's metadata as base
  const baseMetadata = chunks[0].metadata;
  
  // Merge all transcripts with adjusted timestamps
  const mergedTranscript: TranscriptSegment[] = [];
  let cumulativeTime = 0; // Total seconds processed so far
  
  chunks.forEach((chunk, chunkIndex) => {
    chunk.transcript.forEach((segment) => {
      // Adjust timestamp based on chunk position
      const adjustedTimestamp = adjustTimestamp(
        segment.timestamp,
        cumulativeTime
      );
      
      mergedTranscript.push({
        ...segment,
        timestamp: adjustedTimestamp
      });
    });
    
    // Add cumulative time for next chunk
    if (chunkIndex < chunkDurations.length) {
      cumulativeTime += chunkDurations[chunkIndex];
    }
  });

  // Merge metadata
  const mergedMetadata = {
    ...baseMetadata,
    tags: mergeTags(chunks.map(c => c.metadata.tags)),
    summary: mergeSummaries(chunks.map(c => c.metadata.summary)),
    language: mergeLanguages(chunks.map(c => c.metadata.language))
  };

  return {
    metadata: mergedMetadata,
    transcript: mergedTranscript
  };
};

/**
 * Adjust timestamp by adding offset
 */
const adjustTimestamp = (timestamp: string, offsetSeconds: number): string => {
  const [minutes, seconds] = timestamp.split(':').map(Number);
  const totalSeconds = minutes * 60 + seconds + offsetSeconds;
  const newMinutes = Math.floor(totalSeconds / 60);
  const newSeconds = Math.floor(totalSeconds % 60);
  return `${String(newMinutes).padStart(2, '0')}:${String(newSeconds).padStart(2, '0')}`;
};

/**
 * Merge tags from all chunks, removing duplicates
 */
const mergeTags = (tagArrays: string[][]): string[] => {
  const tagSet = new Set<string>();
  tagArrays.forEach(tags => {
    tags.forEach(tag => tagSet.add(tag.toLowerCase()));
  });
  return Array.from(tagSet).slice(0, 15); // Limit to 15 tags
};

/**
 * Merge summaries from all chunks
 */
const mergeSummaries = (summaries: string[]): string => {
  // Combine summaries, removing duplicates and creating a cohesive summary
  const uniqueSummaries = Array.from(new Set(summaries));
  return uniqueSummaries.join(' ');
};

/**
 * Merge languages from all chunks
 */
const mergeLanguages = (languages: string[]): string => {
  const languageSet = new Set<string>();
  languages.forEach(lang => {
    // Split by comma if multiple languages
    lang.split(',').forEach(l => {
      languageSet.add(l.trim());
    });
  });
  return Array.from(languageSet).join(', ');
};

/**
 * Remove duplicate segments at chunk boundaries
 */
export const removeBoundaryDuplicates = (transcript: TranscriptSegment[]): TranscriptSegment[] => {
  const cleaned: TranscriptSegment[] = [];
  const seen = new Set<string>();
  
  transcript.forEach((segment, index) => {
    // Create a key from timestamp and first few words
    const key = `${segment.timestamp}-${segment.text.substring(0, 20).toLowerCase()}`;
    
    if (!seen.has(key)) {
      seen.add(key);
      cleaned.push(segment);
    } else if (index > 0) {
      // If duplicate found, check if it's a boundary issue
      const prevSegment = transcript[index - 1];
      if (prevSegment.timestamp === segment.timestamp && 
          prevSegment.text.toLowerCase() === segment.text.toLowerCase()) {
        // Skip this duplicate
        return;
      }
      cleaned.push(segment);
    }
  });
  
  return cleaned;
};

