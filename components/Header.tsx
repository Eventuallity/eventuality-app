import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet, Animated } from 'react-native';
import Icon from './Icon';

interface HeaderProps {
  onUploadClick: () => void;
  onLogoutClick: () => void;
  isSearchActive: boolean;
  searchTerm: string;
  onToggleSearch: (active: boolean) => void;
  onSearchTermChange: (term: string) => void;
}

const EventualityLogo = () => (
  <View style={styles.logoContainer}>
    <Text style={styles.logoEvent}>Event</Text>
    <Text style={styles.logoUality}>uality</Text>
  </View>
);

const Header: React.FC<HeaderProps> = ({ 
  onUploadClick, 
  onLogoutClick,
  isSearchActive,
  searchTerm,
  onToggleSearch,
  onSearchTermChange
}) => {
  const searchInputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (isSearchActive) {
      searchInputRef.current?.focus();
    }
  }, [isSearchActive]);

  return (
    <View style={styles.header}>
      <View style={styles.container}>
        {!isSearchActive ? (
          <>
            <View style={styles.left}>
              <EventualityLogo />
            </View>
            <View style={styles.right}>
              <Pressable onPress={() => onToggleSearch(true)} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]} aria-label="Search">
                <Icon name="search" className="w-6 h-6" />
              </Pressable>
              <Pressable onPress={onUploadClick} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]} aria-label="Upload Flyer">
                <Icon name="plus" className="w-6 h-6" />
              </Pressable>
              <Pressable onPress={onLogoutClick} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]} aria-label="Log Out">
                <Icon name="user" className="w-6 h-6" />
              </Pressable>
            </View>
          </>
        ) : (
          <View style={styles.searchContainer}>
            <View style={styles.searchInputWrapper}>
              <TextInput
                ref={searchInputRef}
                style={styles.searchInput}
                placeholder="Search events, clubs..."
                placeholderTextColor="#57534e" // stone-500
                value={searchTerm}
                onChangeText={onSearchTermChange}
              />
              <View style={styles.searchIcon}>
               <Icon name="search" className="w-5 h-5 text-stone-500" /> 
              </View>
            </View>
            <Pressable onPress={() => onToggleSearch(false)}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
    header: {
        backgroundColor: 'rgba(28, 25, 23, 0.5)',
        borderBottomWidth: 1,
        borderColor: 'rgba(41, 37, 36, 0.7)',
    },
    container: {
        height: 64,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
    },
    left: {
        flex: 1,
        alignItems: 'flex-start',
    },
    right: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    logoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    logoEvent: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#f5f5f4', // stone-100
        letterSpacing: -0.5,
    },
    logoUality: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#a855f7', // purple-500
        letterSpacing: -0.5,
    },
    searchContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    searchInputWrapper: {
        flex: 1,
        justifyContent: 'center',
    },
    searchInput: {
        height: 40,
        backgroundColor: '#1c1917', // stone-950
        borderColor: '#44403c', // stone-700
        borderWidth: 1,
        borderRadius: 9999,
        paddingLeft: 40,
        paddingRight: 16,
        color: '#e7e5e4', // stone-200
    },
    searchIcon: {
        position: 'absolute',
        left: 16,
    },
    cancelButton: {
        color: '#a855f7', // purple-500
        fontWeight: '500',
        paddingHorizontal: 8,
    },
    iconButton: {
        padding: 8,
        borderRadius: 9999,
    },
    pressed: {
        backgroundColor: 'rgba(41, 37, 36, 0.5)',
    },
});

export default Header;
