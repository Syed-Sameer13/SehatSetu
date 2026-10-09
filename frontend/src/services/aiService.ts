import { request } from './apiClient';
import {
  AISummarizeRequest,
  AISummarizeResponse,
  PatientAssistantRequest,
  PatientAssistantResponse,
} from '../types';

export const aiService = {
  summarizeSymptoms: async (payload: AISummarizeRequest): Promise<AISummarizeResponse> => {
    return request<AISummarizeResponse>('/ai/summarize-symptoms', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  askPatientAssistant: async (payload: PatientAssistantRequest): Promise<PatientAssistantResponse> => {
    return request<PatientAssistantResponse>('/ai/patient-assistant', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};

