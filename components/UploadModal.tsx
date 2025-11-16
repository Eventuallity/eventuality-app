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
import DateTimePicker from '@react-native-community/datetimepicker';
import { Category, Flyer } from '.././types';
import { CATEGORIES } from '.././constants';
import Icon from './Icon';
import * as DocumentPicker from 'expo-document-picker';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../supabase-client';

interface UploadModalProps {
  visible: boolean;
  onClose: () => void;
  onUploadSuccess: (flyer: Flyer) => void;
}

type UploadStep = 'select' | 'processing' | 'confirm' | 'success';

const normalizeCategoryString = (value: string): string => value.trim().toLowerCase();

const resolveCategory = (value: unknown): Category | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = normalizeCategoryString(value);
  const match = (Object.values(Category) as string[]).find(
    category => normalizeCategoryString(category) === normalized
  );

  return match ? (match as Category) : undefined;
};

const resolveCategories = (value: unknown): Category[] => {
  if (Array.isArray(value)) {
    const resolved = value
      .map(item => resolveCategory(item))
      .filter((item): item is Category => Boolean(item));
    return Array.from(new Set(resolved));
  }

  const single = resolveCategory(value);
  return single ? [single] : [];
};

const CategorySelector: React.FC<{
  selectedCategories: Category[];
  onToggleCategory: (category: Category) => void;
}> = ({ selectedCategories, onToggleCategory }) => {
  return (
    <View style={styles.categoryGrid}>
      {CATEGORIES.map((category) => {
        const isSelected = selectedCategories.includes(category);
        return (
          <Pressable
            key={category}
            onPress={() => onToggleCategory(category)}
            style={({ pressed }) => [
              styles.categoryChip,
              isSelected && styles.categoryChipSelected,
              pressed && styles.categoryChipPressed,
            ]}
          >
            <Text style={[
              styles.categoryChipText,
              isSelected && styles.categoryChipTextSelected
            ]}>
              {category}
            </Text>
            {isSelected && (
              <View style={styles.checkmark}>
                <Icon name="check" className="w-4 h-4" color="#a855f7" />
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
};

type SelectedAsset = {
  uri: string;
  name?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
};

const FALLBACK_IMAGE_NAME = 'poster.jpg';

const UploadModal: React.FC<UploadModalProps> = ({ visible, onClose, onUploadSuccess }) => {
  const [step, setStep] = useState<UploadStep>('select');
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileUri, setFileUri] = useState<string | null>(null);
  const [storageUrl, setStorageUrl] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<Partial<Flyer>>({});
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([Category.ACADEMIC]);
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

      const aiCategories = resolveCategories(parsed.categories);
      if (aiCategories.length) {
        result.categories = aiCategories;
        if (!result.category) {
          result.category = aiCategories[0];
        }
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

  const sanitizeFileName = (raw: string) => {
    return raw.replace(/[^a-zA-Z0-9._-]/g, '_');
  };

  const guessExtensionForMime = (mime?: string | null) => {
    if (!mime) return 'bin';
    if (mime === 'application/pdf') return 'pdf';
    if (mime === 'image/png') return 'png';
    if (mime === 'image/webp') return 'webp';
    if (mime === 'image/heic') return 'heic';
    if (mime === 'image/heif') return 'heif';
    if (mime === 'image/jpeg') return 'jpg';
    if (mime.startsWith('image/')) return mime.split('/')[1];
    return 'bin';
  };

  const getDisplayName = (asset: SelectedAsset) => {
    const base = asset.name ?? asset.fileName ?? asset.uri.split('/').pop() ?? 'event-flyer';
    if (base.includes('.')) {
      return base;
    }
    const extension = guessExtensionForMime(asset.mimeType);
    return `${base}.${extension}`;
  };

  const ensureCameraPermission = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Camera permission needed',
        'Please grant camera access to scan a poster.'
      );
      return false;
    }
    return true;
  };

  const processSelectedAsset = async (asset: SelectedAsset) => {
    setError(null);
    setShowDatePicker(false);
    setShowTimePicker(false);

    const displayName = getDisplayName(asset);
    const sanitizedName = sanitizeFileName(displayName);
    const contentType = asset.mimeType
      ?? (displayName.toLowerCase().endsWith('.pdf')
        ? 'application/pdf'
        : displayName.match(/\.png$/i)
          ? 'image/png'
          : displayName.match(/\.jpe?g$/i)
            ? 'image/jpeg'
            : displayName.match(/\.webp$/i)
              ? 'image/webp'
              : 'application/octet-stream');

    setFileName(displayName);
    setFileUri(asset.uri);

    try {
      setStep('processing');
      setStorageUrl(null);

      const response = await fetch(asset.uri);
      if (!response.ok) {
        throw new Error('Unable to access selected file');
      }
      const fileBytes = await response.arrayBuffer();

      const filePath = `flyers/${Date.now()}-${sanitizedName}`;

      const { error: uploadError } = await supabase.storage
        .from('flyers')
        .upload(filePath, fileBytes, {
          contentType,
          upsert: false,
        });

      if (uploadError) {
        throw new Error(uploadError.message ?? 'Failed to upload file');
      }

      const { data: publicUrlData } = supabase.storage
        .from('flyers')
        .getPublicUrl(filePath);

      const publicUrl = publicUrlData?.publicUrl ?? null;
      setStorageUrl(publicUrl);

      const inferredTitle = displayName.replace(/\.[^/.]+$/, '') || 'Untitled Event';

      let parsedDetails: Partial<Flyer> | null = null;
      if (publicUrl) {
        parsedDetails = await parseFlyerWithGemini(publicUrl, displayName ?? null);
      }

      const primaryCategory = parsedDetails?.category ?? Category.ACADEMIC;
      const nextCategoriesRaw = parsedDetails?.categories?.length
        ? parsedDetails.categories
        : [primaryCategory];
      let nextCategories = Array.from(new Set(nextCategoriesRaw.filter(Boolean))) as Category[];
      if (!nextCategories.length) {
        nextCategories = [Category.ACADEMIC];
      }

      const mergedDetails: Partial<Flyer> = {
        ...(parsedDetails ?? {}),
        title: parsedDetails?.title ?? inferredTitle,
        category: nextCategories[0] ?? primaryCategory,
        categories: nextCategories,
      };

      if (!mergedDetails.description && parsedDetails?.description) {
        mergedDetails.description = parsedDetails.description;
      }

      setExtractedData(mergedDetails);
      setSelectedCategories(nextCategories);
      const nextTempDate = (() => {
        if (mergedDetails.eventDate) {
          const next = new Date(mergedDetails.eventDate);
          if (!isNaN(next.getTime())) {
            return next;
          }
        }
        return new Date();
      })();
      setTempDate(nextTempDate);
      setStep('confirm');
    } catch (err: any) {
      console.error('Upload or parsing failed', err);
      setError(err?.message ?? 'Failed to upload or parse flyer');
      Alert.alert('Upload error', err?.message ?? 'Failed to upload or parse flyer');
      setStep('select');
    }
  };

  const handleFileSelect = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*'],
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (result.canceled || !result.assets?.length) {
      return;
    }

    const asset = result.assets[0];
    await processSelectedAsset({
      uri: asset.uri,
      name: asset.name,
      mimeType: asset.mimeType ?? undefined,
    });
  };

  const handleScanPoster = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Not supported on web', 'Scanning posters is only available on mobile.');
      return;
    }

    const hasPermission = await ensureCameraPermission();
    if (!hasPermission) {
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
    });

    if (result.canceled || !result.assets?.length) {
      return;
    }

    const asset = result.assets[0];
    const name = asset.fileName ?? asset.uri.split('/').pop() ?? FALLBACK_IMAGE_NAME;
    await processSelectedAsset({
      uri: asset.uri,
      name,
      fileName: name,
      mimeType: asset.mimeType ?? 'image/jpeg',
    });
  };

  const isFutureDate = (iso: string | undefined): boolean => {
    if (!iso) return false;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return false;
    return d.getTime() > Date.now();
  };

  const handleDataChange = (field: keyof Flyer, value: string | Category) => {
    setExtractedData(prev => ({ ...prev, [field]: value }));
  };

  const handleToggleCategory = (category: Category) => {
    setSelectedCategories(prev => {
      let next: Category[];
      if (prev.includes(category)) {
        if (prev.length === 1) {
          Alert.alert('At least one category', 'Please select at least one category for the event.');
          return prev;
        }
        next = prev.filter(c => c !== category);
      } else {
        next = [...prev, category];
      }

      setExtractedData(current => ({
        ...current,
        categories: next,
        category: next[0] ?? current?.category,
      }));

      return next;
    });
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

    if (selectedCategories.length === 0) {
      Alert.alert(
        'Missing category',
        'Please select at least one category for the event.'
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
      imageUrl: storageUrl,
      eventDate: finalEventDate,
      category: selectedCategories[0], // Primary category (first selected)
      categories: selectedCategories, // All selected categories
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
        setSelectedCategories([Category.ACADEMIC]);
        setError(null);
      }, 500);
    }, 2000);
  };

  const renderContent = () => {
    switch(step) {
      case 'select':
        return (
          <View style={styles.centerContent}>
            <Text style={styles.title}>Upload a Flyer</Text>
            <Text style={styles.subtitle}>Scan a poster with your camera or upload a PDF/image.</Text>
            <View style={styles.actionButtons}>
              {Platform.OS !== 'web' && (
                <Pressable onPress={handleScanPoster} style={styles.button}>
                  <Icon name="camera" className="w-6 h-6" color="white" />
                  <Text style={styles.buttonText}>Scan Poster</Text>
                </Pressable>
              )}
              <Pressable onPress={handleFileSelect} style={styles.button}>
                <Icon name="upload" className="w-6 h-6" color="white" />
                <Text style={styles.buttonText}>Upload From Files</Text>
              </Pressable>
            </View>
          </View>
        );
      case 'processing':
        return (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color="#a855f7" />
            <Text style={[styles.title, { marginTop: 24 }]}>Processing...</Text>
            <Text style={styles.subtitle}>Uploading your flyer.</Text>
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
              <Pressable
                onPress={() => {
                  const current = extractedData.eventDate
                    ? new Date(extractedData.eventDate)
                    : new Date();
                  setTempDate(current);
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

              {showDatePicker && (
                <DateTimePicker
                  value={tempDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(_event: any, selected?: Date | undefined) => {
                    setShowDatePicker(false);
                    if (selected) {
                      setTempDate(prev => {
                        const next = new Date(prev);
                        next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
                        return next;
                      });
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
                      const merged = new Date(tempDate);
                      merged.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
                      setExtractedData(prev => ({ ...prev, eventDate: merged.toISOString() }));
                    }
                  }}
                />
              )}

              {extractedData.eventDate && !isFutureDate(extractedData.eventDate) && (
                <Text style={{ color: '#f97373', marginTop: 4, fontSize: 12 }}>
                  Event date must be in the future.
                </Text>
              )}

              <Text style={styles.label}>
                Categories <Text style={styles.labelSubtext}>(select all that apply)</Text>
              </Text>
              <CategorySelector
                selectedCategories={selectedCategories}
                onToggleCategory={handleToggleCategory}
              />

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
        backgroundColor: '#1c1917',
        borderRadius: 12,
        padding: 24,
        width: '100%',
        maxWidth: 500,
        maxHeight: '90%',
        borderColor: '#44403c',
        borderWidth: 1,
    },
    closeButton: {
        position: 'absolute',
        top: 16,
        right: 16,
        zIndex: 10,
    },
    centerContent: { alignItems: 'center', justifyContent: 'center', width: '100%' },
    title: { fontSize: 24, fontWeight: 'bold', color: '#f5f5f4', marginBottom: 16 },
    subtitle: { color: '#a8a29e', marginBottom: 24, textAlign: 'center', paddingHorizontal: 8 },
    button: { width: '100%', backgroundColor: '#9333ea', paddingVertical: 12, borderRadius: 8, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
    buttonText: { color: 'white', fontWeight: 'bold' },
    fileName: { color: '#78716c', marginTop: 16 },
    successIconContainer: { backgroundColor: 'rgba(168, 85, 247, 0.1)', borderRadius: 9999, width: 64, height: 64, justifyContent: 'center', alignItems: 'center' },
    form: { gap: 16 },
    label: { color: '#a8a29e', fontWeight: '500', marginBottom: 4 },
    labelSubtext: { color: '#78716c', fontWeight: '400', fontSize: 12 },
    input: { backgroundColor: '#292524', borderColor: '#44403c', borderWidth: 1, borderRadius: 6, padding: 10, color: '#e7e5e4' },
    pickerButton: { justifyContent: 'center' },
    textArea: { height: 100, textAlignVertical: 'top' },
    categoryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    categoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#292524',
        borderWidth: 1.5,
        borderColor: '#44403c',
        gap: 6,
    },
    categoryChipSelected: {
        backgroundColor: 'rgba(168, 85, 247, 0.15)',
        borderColor: '#a855f7',
    },
    categoryChipPressed: {
        opacity: 0.7,
    },
    categoryChipText: {
        color: '#d6d3d1',
        fontSize: 13,
        fontWeight: '500',
    },
    categoryChipTextSelected: {
        color: '#a855f7',
        fontWeight: '600',
    },
    checkmark: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: 'rgba(168, 85, 247, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionButtons: {
      width: '100%',
      gap: 12,
      display: 'flex',
    },
});

export default UploadModal;