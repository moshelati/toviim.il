export {
  sendMessage,
  extractJSON,
  extractStructuredData,
  buildInterviewSystemPrompt,
  buildMockTrialPrompt,
} from './geminiClient';
export { AIError, classifyError } from './errors';
export type { GeminiMessage, StructuredClaimData, AIRequestOptions } from './types';
export { isAIReady } from '../config/ai';
