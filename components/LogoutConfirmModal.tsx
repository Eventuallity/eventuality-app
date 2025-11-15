import React from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import Icon from './Icon';

interface LogoutConfirmModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const LogoutConfirmModal: React.FC<LogoutConfirmModalProps> = ({ visible, onClose, onConfirm }) => {
  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalContent}>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Icon name="x" className="w-6 h-6" />
          </Pressable>
          
          <View style={styles.iconContainer}>
            <Icon name="logout" className="h-6 w-6" color="#c084fc" />
          </View>
          
          <Text style={styles.title}>Log Out</Text>
          <Text style={styles.subtitle}>Are you sure you want to log out?</Text>
          
          <View style={styles.buttonContainer}>
            <Pressable onPress={onClose} style={[styles.button, styles.cancelButton]}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
            <Pressable onPress={onConfirm} style={[styles.button, styles.confirmButton]}>
                <Icon name="logout" className="w-5 h-5" color="white" />
                <Text style={styles.confirmButtonText}>Log Out</Text>
            </Pressable>
          </View>
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
        maxWidth: 400,
        alignItems: 'center',
        borderColor: '#44403c',
        borderWidth: 1,
    },
    closeButton: {
        position: 'absolute',
        top: 16,
        right: 16,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#f5f5f4',
        marginBottom: 8,
    },
    subtitle: {
        color: '#a8a29e',
        marginBottom: 32,
        textAlign: 'center',
    },
    buttonContainer: {
        flexDirection: 'row',
        width: '100%',
        gap: 12,
    },
    button: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
        gap: 8,
    },
    cancelButton: {
        backgroundColor: '#292524',
    },
    cancelButtonText: {
        color: '#d6d3d1',
        fontWeight: 'bold',
    },
    confirmButton: {
        backgroundColor: '#9333ea',
    },
    confirmButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },
});

export default LogoutConfirmModal;
