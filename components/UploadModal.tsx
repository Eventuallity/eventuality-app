import React, { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Category, Flyer } from '.././types';
import Icon from './Icon';

import * as DocumentPicker from 'expo-document-picker';
import { Alert } from 'react-native';
import { supabase } from '../supabase-client';





interface UploadModalProps {
  visible: boolean;
  onClose: () => void;
  onUploadSuccess: (flyer: Flyer) => void;
}

type UploadStep = 'select' | 'processing' | 'confirm' | 'success';

const GEMINI_API_KEY = 'key'; // move to env later
const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-pro:generateContent';

const UploadModal: React.FC<UploadModalProps> = ({ visible, onClose, onUploadSuccess }) => {
  const [step, setStep] = useState<UploadStep>('select');
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileUri, setFileUri] = useState<string | null>(null);
  const [storageUrl, setStorageUrl] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<Partial<Flyer>>({});
  const [isPosting, setIsPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = async () => {
    setError(null);

    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf'],
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return;
    }

    const asset = result.assets[0];
    setFileName(asset.name ?? 'flyer.pdf');
    setFileUri(asset.uri);

    try {
      setStep('processing');

      // 1) Upload to Supabase Storage
      const pdfBytes = await fetch(asset.uri).then(res => res.arrayBuffer());
      const filePath = `flyers/${Date.now()}-${asset.name ?? 'flyer.pdf'}`;

      const { error: uploadError } = await supabase.storage
        .from('flyers')
        .upload(filePath, pdfBytes, {
          contentType: 'application/pdf',
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicUrlData } = supabase.storage
        .from('flyers')
        .getPublicUrl(filePath);

      const publicUrl = publicUrlData?.publicUrl;
      setStorageUrl(publicUrl ?? null);

      // 2) Call Gemini to parse PDF
      if (publicUrl) {
        await parsePdfWithGemini(publicUrl);
      } else {
        throw new Error('Could not get public URL for uploaded file.');
      }

      setStep('confirm');
    } catch (err: any) {
      console.error('Upload or parsing failed', err);
      setError(err?.message ?? 'Failed to upload or parse flyer');
      Alert.alert('Upload error', err?.message ?? 'Failed to upload or parse flyer');
      setStep('select');
    }
  };

  //helper to parse PDF with Gemini API

  const parsePdfWithGemini = async (pdfUrl: string) => {
    const prompt = `
You are extracting event details from a university event flyer PDF.

The ONLY source of truth is the text inside the PDF at:
${pdfUrl}

Use these rules STRICTLY:
- Use ONLY exact text from the flyer. Do NOT infer or invent missing info.
- If you are not 100% sure about a field, set it to an empty string "".
- For organization, use the club/department/host as written (e.g. "Computer Science Club", "Career Center").
- For location, use building + room or address exactly as written.

For datetime:
- Use ONLY the date/time written on the flyer.
- Prefer to normalize it to a standard readable format if possible, using the flyer text:
  Examples:
    "11/24/25 7:30 pm"
    "11/24/2025 19:00"
    "Nov 24 2025 7:30 pm"
    "Friday, November 24, 2025 at 7:30 PM"
- If multiple dates are present (e.g. a series), pick the MAIN event date (the one most emphasized).
- If you cannot clearly find a date and time, or it looks like a past year that obviously already happened, set datetime to "".

Return ONLY a single JSON object, no extra text, with this EXACT shape:
{
  "title": string,
  "organization": string,
  "location": string,
  "datetime": string,
  "description": string
}

Where:
- "title" is the main event title.
- "organization" is the host/club/department, or "" if unclear.
- "location" is the venue/building/room/address, or "" if unclear.
- "datetime" is the date and time as a single human-readable string (examples above), or "" if unclear or clearly in the past.
- "description" is 1–3 sentences summarizing the event USING ONLY text from the flyer; if not possible, use "".

Examples of valid JSON outputs (no comments):

{"title":"Career Fair 2025","organization":"Career Center","location":"Student Union Ballroom","datetime":"Friday, October 10, 2025 at 2:00 PM","description":"Meet employers hiring for internships and full-time roles."}
{"title":"Study Night","organization":"","location":"","datetime":"","description":""}

Now output ONLY the JSON object, no explanation, no markdown.
`;

    const body = {
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
    };

    const res = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Gemini error: ${res.status} ${text}`);
    }

    const json = await res.json();

    const rawText: string | undefined =
      json?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      throw new Error('Gemini returned no content');
    }

    // Gemini often returns JSON as text; try to parse it
    let parsed: any;
    try {
      const cleaned = rawText
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();
      parsed = JSON.parse(cleaned);
    } catch (e) {
      console.warn('Failed to parse JSON from Gemini, output:', rawText);
      throw new Error('Failed to parse Gemini output as JSON');
    }

    const cleanString = (val: any): string =>
      typeof val === 'string' ? val.trim() : '';

    let title = cleanString(parsed.title);
    let organization = cleanString(parsed.organization);
    let location = cleanString(parsed.location);
    let datetime = cleanString(parsed.datetime);
    let description = cleanString(parsed.description);

    let isoEventDate: string | undefined;
    if (datetime) {
      const d = new Date(datetime);
      if (!isNaN(d.getTime())) {
        isoEventDate = d.toISOString();
      } else {
        // If Date can't parse it, treat as unknown
        datetime = '';
      }
    }

    setExtractedData({
      title,
      organization,
      location,
      description,
      eventDate: isoEventDate,
      category: Category.ACADEMIC,
    });
  };

//end of helper





  const isFutureDate = (iso: string | undefined): boolean => {
    if (!iso) return false;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return false;
    return d.getTime() > Date.now();
  };

  const handleDataChange = (field: keyof Flyer, value: string | Category) => {
    setExtractedData(prev => ({ ...prev, [field]: value }));
  };

  const handleConfirm = () => {
    setError(null);

    const finalEventDate = extractedData.eventDate;

    if (!finalEventDate) {
      Alert.alert(
        'Missing event date',
        'Please provide a valid event date and time before posting.'
      );
      return;
    }

    if (!isFutureDate(finalEventDate)) {
      Alert.alert(
        'Invalid event date',
        'The event date and time must be in the future. Please correct it before posting.'
      );
      return;
    }

    if (!storageUrl) {
      Alert.alert(
        'Missing file',
        'Please upload the flyer again; we could not find the storage URL.'
      );
      return;
    }

    setIsPosting(true);

    const newFlyer: Flyer = {
      id: new Date().toISOString(),
      title: extractedData.title || 'Untitled Event',
      description: extractedData.description || '',
      imageUrl: storageUrl, // use Supabase URL instead of placeholder
      eventDate: finalEventDate,
      category: extractedData.category || Category.CLUB,
      location: extractedData.location || '',
      organization: extractedData.organization || '',
      likes: 0,
      dislikes: 0,
      uploader: { id: 'currentUser', name: 'Me' },
    };

    onUploadSuccess(newFlyer);
    setStep('success');
    setIsPosting(false);
    setTimeout(() => {
      onClose();
      // Reset state for next time
      setTimeout(() => {
        setStep('select');
        setFileName(null);
        setFileUri(null);
        setStorageUrl(null);
        setExtractedData({});
        setError(null);
      }, 500);
    }, 2000);
  };





  // NOTE: stray Pressable block removed; the real submit button lives in the confirm step below.


  const renderContent = () => {
    switch(step) {
      case 'select':
        return (
          <View style={styles.centerContent}>
            <Text style={styles.title}>Upload a Flyer</Text>
            <Text style={styles.subtitle}>Upload a PDF or image of an event flyer.</Text>
            <Pressable onPress={handleFileSelect} style={styles.button}>
              <Icon name="upload" className="w-6 h-6" color="white" />
              <Text style={styles.buttonText}>Select File</Text>
            </Pressable>
          </View>
        );
      case 'processing':
        return (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color="#a855f7" />
            <Text style={[styles.title, { marginTop: 24 }]}>Processing...</Text>
            <Text style={styles.subtitle}>Our AI is reading your flyer.</Text>
            <Text style={styles.fileName}>{fileName}</Text>
          </View>
        );

case 'confirm':
  return (
    <ScrollView>
      <Text style={styles.title}>Confirm Details</Text>
      <View style={styles.form}>
        <Text style={styles.label}>Title</Text>
        <TextInput
          style={styles.input}
          value={extractedData.title ?? ''}
          onChangeText={(val) => handleDataChange('title', val)}
        />

        <Text style={styles.label}>Organization</Text>
        <TextInput
          style={styles.input}
          value={extractedData.organization ?? ''}
          onChangeText={(val) => handleDataChange('organization', val)}
        />

        <Text style={styles.label}>Location</Text>
        <TextInput
          style={styles.input}
          value={extractedData.location ?? ''}
          onChangeText={(val) => handleDataChange('location', val)}
        />

        <Text style={styles.label}>Date & Time</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Nov 24 2025 7:30 pm"
          value={
            extractedData.eventDate
              ? new Date(extractedData.eventDate).toLocaleString()
              : ''
          }
          onChangeText={(val) => {
            const d = new Date(val);
            if (!isNaN(d.getTime())) {
              setExtractedData(prev => ({ ...prev, eventDate: d.toISOString() }));
            } else {
              setExtractedData(prev => ({ ...prev, eventDate: undefined }));
            }
          }}
        />
        {/* Optional inline validation message */}
        {extractedData.eventDate && !isFutureDate(extractedData.eventDate) && (
          <Text style={{ color: '#f97373', marginTop: 4, fontSize: 12 }}>
            Event date must be in the future.
          </Text>
        )}

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          multiline
          value={extractedData.description ?? ''}
          onChangeText={(val) => handleDataChange('description', val)}
        />
      </View>

      <Pressable
        onPress={handleConfirm}
        style={[styles.button, { marginTop: 32, opacity: isPosting ? 0.7 : 1 }]}
        disabled={isPosting}
      >
        <Text style={styles.buttonText}>
          {isPosting ? 'Posting...' : 'Looks Good! Post Event'}
        </Text>
      </Pressable>
    </ScrollView>
  );
      
      

        

      case 'success':
        return (
          <View style={styles.centerContent}>
            <View style={styles.successIconContainer}>
                <Icon name="check" className="w-10 h-10" color="#a855f7" />
            </View>
            <Text style={[styles.title, { marginTop: 24 }]}>Success!</Text>
            <Text style={styles.subtitle}>Your event has been posted.</Text>
          </View>
        );
    }
  };

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalContent}>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Icon name="x" className="w-6 h-6" />
          </Pressable>
          {renderContent()}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(28, 25, 23, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
    },
    modalContent: {
        backgroundColor: '#1c1917', // stone-950
        borderRadius: 12,
        padding: 24,
        width: '100%',
        maxWidth: 500,
        borderColor: '#44403c', // stone-700
        borderWidth: 1,
    },
    closeButton: {
        position: 'absolute',
        top: 16,
        right: 16,
    },
    centerContent: { alignItems: 'center', justifyContent: 'center' },
    title: { fontSize: 24, fontWeight: 'bold', color: '#f5f5f4', marginBottom: 16 },
    subtitle: { color: '#a8a29e', marginBottom: 32, textAlign: 'center' },
    button: { width: '100%', backgroundColor: '#9333ea', paddingVertical: 12, borderRadius: 8, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
    buttonText: { color: 'white', fontWeight: 'bold' },
    fileName: { color: '#78716c', marginTop: 16 },
    successIconContainer: { backgroundColor: 'rgba(168, 85, 247, 0.1)', borderRadius: 9999, width: 64, height: 64, justifyContent: 'center', alignItems: 'center' },
    form: { gap: 16 },
    label: { color: '#a8a29e', fontWeight: '500', marginBottom: 4 },
    input: { backgroundColor: '#292524', borderColor: '#44403c', borderWidth: 1, borderRadius: 6, padding: 10, color: '#e7e5e4' },
    textArea: { height: 100, textAlignVertical: 'top' },
});

export default UploadModal;
