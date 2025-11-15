import React, { useState } from 'react';
import { Modal, View, Text, Pressable, StyleSheet, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { Flyer, Category } from '.././types';
import Icon from './Icon';

interface UploadModalProps {
  visible: boolean;
  onClose: () => void;
  onUploadSuccess: (flyer: Flyer) => void;
}

type UploadStep = 'select' | 'processing' | 'confirm' | 'success';

const UploadModal: React.FC<UploadModalProps> = ({ visible, onClose, onUploadSuccess }) => {
  const [step, setStep] = useState<UploadStep>('select');
  const [fileName, setFileName] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<Partial<Flyer>>({});

  const handleFileSelect = () => {
    // In React Native, we'd use a library like react-native-document-picker
    // Here we simulate the process.
    setFileName('flyer-image.jpg');
    setStep('processing');
    
    setTimeout(() => {
      setExtractedData({
        title: 'Mock: AI-Extracted Title',
        description: 'This is a mock description extracted by an AI from the uploaded flyer.',
        eventDate: '2024-11-15T20:00:00.000Z',
        category: Category.ACADEMIC,
        location: 'Student Union Building, Room 201',
        organization: 'Engineering Society',
      });
      setStep('confirm');
    }, 2500);
  };

  const handleDataChange = (field: keyof Flyer, value: string | Category) => {
    setExtractedData(prev => ({ ...prev, [field]: value }));
  };

  const handleConfirm = () => {
    const newFlyer: Flyer = {
      id: new Date().toISOString(),
      title: extractedData.title || 'Untitled Event',
      description: extractedData.description || '',
      imageUrl: 'https://picsum.photos/seed/newevent/500/800',
      eventDate: extractedData.eventDate || new Date().toISOString(),
      category: extractedData.category || Category.CLUB,
      location: extractedData.location || '',
      organization: extractedData.organization || '',
      likes: 0,
      dislikes: 0,
      uploader: { id: 'currentUser', name: 'Me' }
    };
    onUploadSuccess(newFlyer);
    setStep('success');
    setTimeout(() => {
        onClose();
        // Reset state for next time
        setTimeout(() => setStep('select'), 500);
    }, 2000);
  };

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
                <TextInput style={styles.input} value={extractedData.title} onChangeText={(val) => handleDataChange('title', val)} />
                <Text style={styles.label}>Organization</Text>
                <TextInput style={styles.input} value={extractedData.organization} onChangeText={(val) => handleDataChange('organization', val)} />
                <Text style={styles.label}>Location</Text>
                <TextInput style={styles.input} value={extractedData.location} onChangeText={(val) => handleDataChange('location', val)} />
                <Text style={styles.label}>Date</Text>
                <TextInput style={styles.input} value={extractedData.eventDate?.substring(0, 16)} onChangeText={(val) => handleDataChange('eventDate', new Date(val).toISOString())} />
                <Text style={styles.label}>Description</Text>
                <TextInput style={[styles.input, styles.textArea]} multiline value={extractedData.description} onChangeText={(val) => handleDataChange('description', val)} />
            </View>
            <Pressable onPress={handleConfirm} style={[styles.button, { marginTop: 32 }]}>
              <Text style={styles.buttonText}>Looks Good! Post Event</Text>
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
