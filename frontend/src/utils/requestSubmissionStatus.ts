import type { ValidationIssue } from './demoLoadPolicy';
import type { LanguageCode } from '../i18n/types';

export interface SubmissionResponse {
  id: string;
  status: string;
  validation_notes?: string;
  validation_issues?: ValidationIssue[] | null;
}

export type SubmissionNotice =
  | { kind: 'pending' }
  | { kind: 'received' | 'correction'; reference: string; status: string; notes: string; issues: ValidationIssue[] }
  | { kind: 'unknown' };

export function submissionNoticeFromResponse(response: SubmissionResponse): SubmissionNotice {
  return {
    kind: response.status === 'NEEDS_CORRECTION' ? 'correction' : 'received',
    reference: response.id,
    status: response.status,
    notes: response.status === 'NEEDS_CORRECTION' ? response.validation_notes || '' : '',
    issues: response.status === 'NEEDS_CORRECTION' && Array.isArray(response.validation_issues) ? response.validation_issues : [],
  };
}

export const submissionNoticeText: Record<LanguageCode, {
  pending: string; received: string; correction: string; unknown: string; separate: string;
}> = {
  en: {
    pending: 'Sending the live request…',
    received: 'The live request was recorded. Its current status is shown below; this is not an approval.',
    correction: 'The live request needs correction or review. See the backend reason below.',
    unknown: 'The live submission could not be confirmed. It may still have been received; check before retrying.',
    separate: 'The demo application is a separate local record, not the live request.',
  },
  gu: {
    pending: 'લાઇવ અરજી મોકલાઈ રહી છે…',
    received: 'લાઇવ અરજી નોંધાઈ છે. તેની હાલની સ્થિતિ નીચે છે; આ મંજૂરી નથી.',
    correction: 'લાઇવ અરજીમાં સુધારો અથવા સમીક્ષા જરૂરી છે. નીચે સર્વરનું કારણ જુઓ.',
    unknown: 'લાઇવ અરજીની પુષ્ટિ થઈ શકી નથી. તે નોંધાઈ હોઈ શકે છે; ફરી મોકલતાં પહેલાં તપાસો.',
    separate: 'ડેમો અરજી અલગ સ્થાનિક રેકોર્ડ છે; તે લાઇવ અરજી નથી.',
  },
  hi: {
    pending: 'लाइव आवेदन भेजा जा रहा है…',
    received: 'लाइव आवेदन दर्ज हो गया है। उसकी वर्तमान स्थिति नीचे है; यह स्वीकृति नहीं है।',
    correction: 'लाइव आवेदन में सुधार या समीक्षा आवश्यक है। नीचे सर्वर का कारण देखें।',
    unknown: 'लाइव आवेदन की पुष्टि नहीं हो सकी। वह प्राप्त हो चुका हो सकता है; दोबारा भेजने से पहले जाँचें।',
    separate: 'डेमो आवेदन एक अलग स्थानीय रिकॉर्ड है, लाइव आवेदन नहीं।',
  },
  mr: {
    pending: 'लाइव्ह अर्ज पाठवला जात आहे…',
    received: 'लाइव्ह अर्ज नोंदवला आहे. त्याची सद्यस्थिती खाली आहे; ही मंजुरी नाही.',
    correction: 'लाइव्ह अर्जात दुरुस्ती किंवा पुनरावलोकन आवश्यक आहे. खाली सर्व्हरचे कारण पहा.',
    unknown: 'लाइव्ह अर्जाची पुष्टी होऊ शकली नाही. तो मिळाला असू शकतो; पुन्हा पाठवण्यापूर्वी तपासा.',
    separate: 'डेमो अर्ज ही वेगळी स्थानिक नोंद आहे, लाइव्ह अर्ज नाही.',
  },
};
