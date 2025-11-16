import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Platform,
} from 'react-native';
// Platform Date/Time picker (community package). If you don't have it installed,
// the code gracefully falls back to the existing text input.
import DateTimePicker from '@react-native-community/datetimepicker';
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

const resolveCategory = (value: unknown): Category | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  const match = (Object.values(Category) as string[]).find(
    category => category.toLowerCase() === normalized
  );

  return match ? (match as Category) : undefined;
};

const UploadModal: React.FC<UploadModalProps> = ({ visible, onClose, onUploadSuccess }) => {
  const [step, setStep] = useState<UploadStep>('select');
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileUri, setFileUri] = useState<string | null>(null);
  const [storageUrl, setStorageUrl] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<Partial<Flyer>>({});
  const [isPosting, setIsPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(new Date());

  const parseFlyerWithGemini = async (publicUrl: string, originalFileName: string | null) => {
    try {
      const { data, error } = await supabase.functions.invoke('gemini', {
        body: {
          fileUrl: publicUrl,
          fileName: originalFileName ?? 'EventFlyer.pdf',
        },
      });

      if (error) {
        const context: any = (error as any)?.context;
        let message = error.message ?? 'Gemini invocation failed';

        if (context) {
          if (typeof context === 'string') {
            message = context;
          } else if (typeof context.error === 'string') {
            message = context.error;
          } else if (typeof context.body === 'string') {
            try {
              const bodyJson = JSON.parse(context.body);
              if (typeof bodyJson?.error === 'string') {
                message = bodyJson.error;
              }
            } catch {
              message = context.body;
            }
          } else {
            try {
              message = JSON.stringify(context);
            } catch {
              // ignore — keep existing message
            }
          }
        }

        throw new Error(message);
      }

      const parsed = data?.parsed;
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Gemini returned an unexpected response');
      }

      const result: Partial<Flyer> = {};

      if (typeof parsed.title === 'string' && parsed.title.trim()) {
        result.title = parsed.title.trim();
      }

      if (typeof parsed.description === 'string') {
        result.description = parsed.description.trim();
      }

      if (typeof parsed.eventDate === 'string' && parsed.eventDate.trim()) {
        result.eventDate = parsed.eventDate.trim();
      }

      if (typeof parsed.location === 'string') {
        result.location = parsed.location.trim();
      }

      if (typeof parsed.organization === 'string') {
        result.organization = parsed.organization.trim();
      }

      const aiCategory = resolveCategory(parsed.category);
      if (aiCategory) {
        result.category = aiCategory;
      }

      return result;
    } catch (err: any) {
      console.error('Gemini parsing failed', err);
      setError(err?.message ?? 'Failed to parse flyer with Gemini');
      Alert.alert(
        'Parsing issue',
        'We could not automatically extract the event details. Please fill them in manually.'
      );
      return null;
    }
  };

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

      const publicUrl = publicUrlData?.publicUrl ?? null;
      setStorageUrl(publicUrl);

      const inferredTitle = (asset.name ?? 'Untitled Event').replace(/\.[^/.]+$/, '');

      let parsedDetails: Partial<Flyer> | null = null;
      if (publicUrl) {
        parsedDetails = await parseFlyerWithGemini(publicUrl, asset.name ?? null);
      }

      const mergedDetails: Partial<Flyer> = {
        title: inferredTitle,
        category: Category.ACADEMIC,
        ...(parsedDetails ?? {}),
      };

      setExtractedData(mergedDetails);
      setStep('confirm');
    } catch (err: any) {
      console.error('Upload or parsing failed', err);
      setError(err?.message ?? 'Failed to upload or parse flyer');
      Alert.alert('Upload error', err?.message ?? 'Failed to upload or parse flyer');
      setStep('select');
    }
  };

// Gemini parsing removed — users will confirm details manually in the confirm step.





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
            <Text style={styles.subtitle}>{"Hang tight, we're extracting the details."}</Text>
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
        {/* Friendly picker UI: show formatted date/time and open platform pickers */}
        <Pressable
          onPress={() => {
            const current = extractedData.eventDate
              ? new Date(extractedData.eventDate)
              : new Date();
            setTempDate(current);
            // Open date picker first
            setShowDatePicker(true);
          }}
          style={[styles.input, styles.pickerButton]}
        >
          <Text style={{ color: extractedData.eventDate ? '#e7e5e4' : '#9ca3af' }}>
            {extractedData.eventDate
              ? new Date(extractedData.eventDate).toLocaleString()
              : 'Select date and time'}
          </Text>
        </Pressable>

        {/* Inline date/time pickers (rendered when toggled). On some platforms
            both date and time modes are available; we show them sequentially. */}
        {showDatePicker && (
          <DateTimePicker
            value={tempDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(_event: any, selected?: Date | undefined) => {
              setShowDatePicker(false);
              if (selected) {
                // Keep the selected date and then open the time picker
                setTempDate(prev => {
                  const next = new Date(prev);
                  next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
                  return next;
                });
                // Open time picker next (some platforms combine both; handle gracefully)
                setTimeout(() => setShowTimePicker(true), 50);
              }
            }}
          />
        )}

        {showTimePicker && (
          <DateTimePicker
            value={tempDate}
            mode="time"
            is24Hour={false}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(_event: any, selected?: Date | undefined) => {
              setShowTimePicker(false);
              if (selected) {
                // Merge time into tempDate and set as final eventDate
                const merged = new Date(tempDate);
                merged.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
                setExtractedData(prev => ({ ...prev, eventDate: merged.toISOString() }));
              }
            }}
          />
        )}

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
