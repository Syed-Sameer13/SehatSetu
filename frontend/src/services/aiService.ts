import { request } from './apiClient';
import { AISummarizeRequest, AISummarizeResponse } from '../types';

export const aiService = {
  summarizeSymptoms: async (payload: AISummarizeRequest): Promise<AISummarizeResponse> => {
    return request<AISummarizeResponse>('/ai/summarize-symptoms', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
