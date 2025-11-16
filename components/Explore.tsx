import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import { FlatList, Image, Modal, Pressable, StyleSheet, Text, View, Platform } from 'react-native';
import { Category, Flyer } from '../types';
import { useAuth } from '../auth-context';
import { addEventToCalendar } from '../utils/calendar';
import { recordCalendarAdd } from '../utils/calendar-add';
import { supabase } from '../supabase-client';
import FilterBar from './FilterBar';
import Icon from './Icon';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';

const SUPPORTED_EXTENSIONS = ['pdf', 'png', 'jpg', 'jpeg', 'webp', 'heic', 'heif'];

type UploadPdfRow = {
  id: string | number;
  title?: string | null;
  description?: string | null;
  image_url?: string | null;
  image_id?: string | null;
  date_and_time?: string | null;
  categories?: string | null;
  location?: string | null;
  organization?: string | null;
  created_at?: string | null;
};

const SUPABASE_CATEGORIES = Object.values(Category);

const extractExtension = (urlOrName: string): string | null => {
  const cleaned = urlOrName.split('?')[0].split('#')[0];
  const segment = cleaned.split('/').pop() ?? cleaned;
  const match = segment.match(/\.([a-zA-Z0-9]+)$/);
  return match ? match[1].toLowerCase() : null;
};

const resolveMimeType = (extension: string | null): string => {
  switch (extension) {
    case 'pdf':
      return 'application/pdf';
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'webp':
      return 'image/webp';
    case 'heic':
      return 'image/heic';
    case 'heif':
      return 'image/heif';
    default:
      return 'application/octet-stream';
  }
};

const resolveUti = (extension: string | null): string | undefined => {
  if (Platform.OS !== 'ios') return undefined;
  switch (extension) {
    case 'pdf':
      return 'com.adobe.pdf';
    case 'png':
      return 'public.png';
    case 'jpg':
    case 'jpeg':
      return 'public.jpeg';
    case 'webp':
      return 'org.webmproject.webp';
    case 'heic':
      return 'public.heic';
    case 'heif':
      return 'public.heif';
    default:
      return undefined;
  }
};

const sanitizeFileBaseName = (raw: string): string => raw.trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 60) || 'eventuality_flyer';

const parseCategories = (raw: string | null | undefined): Category[] => {
  if (!raw) return [Category.OTHER];

  const parsed = raw
    .split(',')
    .map(part => part.trim())
    .filter(Boolean)
    .map(part => {
      const match = SUPABASE_CATEGORIES.find(
        category => category.toLowerCase() === part.toLowerCase()
      );
      return match ?? Category.OTHER;
    });

  const unique = Array.from(new Set(parsed));
  return unique.length > 0 ? unique : [Category.OTHER];
};

const normalizeEventDate = (primary?: string | null, fallback?: string | null): string => {
  const candidates = [primary, fallback].filter(Boolean) as string[];

  for (const candidate of candidates) {
    const parsed = new Date(candidate);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  return new Date().toISOString();
};

const FlyerListItem: React.FC<{ 
  flyer: Flyer; 
  onImageClick: (imageUrl: string) => void;
  onLongPressShare: (flyer: Flyer) => void;
  onShowToast: (message: string) => void;
  isAdded: boolean;
  onToggleAdded: (flyerId: string, newState: boolean) => void;
  userEmail?: string | null;
}> = ({ flyer, onImageClick, onLongPressShare, onShowToast, isAdded, onToggleAdded, userEmail }) => {
  const [addCount, setAddCount] = useState(flyer.likes);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Update the count when isAdded changes externally
    setAddCount(flyer.likes + (isAdded ? 1 : 0));
  }, [isAdded, flyer.likes]);

  const handleAdd = async () => {
    if (isLoading) return;

    if (!isAdded) {
      setIsLoading(true);
      
      const startDate = new Date(flyer.eventDate);
      const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);
      
      const success = await addEventToCalendar({
        title: flyer.title,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        location: flyer.location,
        description: flyer.description
      });
      
      setIsLoading(false);
      
      if (success) {
        onToggleAdded(flyer.id, true);
        setAddCount(prev => prev + 1);
        const inserted = await recordCalendarAdd(userEmail, flyer);
        if (!inserted) {
          console.warn('Unable to record calendar add in Supabase');
        }
        onShowToast('Added to calendar');
      } else {
        onShowToast('Failed to add to calendar');
      }
    } else {
      onToggleAdded(flyer.id, false);
      setAddCount(prev => prev - 1);
    }
  };

  const formattedDate = new Date(flyer.eventDate).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  });

  return (
    <View style={styles.itemContainer}>
      <Pressable
        onPress={() => onImageClick(flyer.imageUrl)}
        onLongPress={() => onLongPressShare(flyer)}
        delayLongPress={400}
      >
        <Image source={{ uri: flyer.imageUrl }} style={styles.itemImage} />
      </Pressable>
      <View style={styles.itemDetails}>
        <Text style={styles.itemCategory}>{flyer.category}</Text>
        <Text style={styles.itemTitle} numberOfLines={1}>{flyer.title}</Text>
        <Text style={styles.itemDate}>{formattedDate}</Text>
      </View>
      <Pressable 
        onPress={handleAdd}
        disabled={isLoading}
        style={[
          styles.addButton, 
          isAdded && styles.addedButton,
          isLoading && styles.loadingButton
        ]}
      >
        <Icon 
          name="calendar" 
          className="w-5 h-5" 
          color={isAdded ? '#a855f7' : '#a8a29e'} 
        />
        <Text style={[styles.addCount, isAdded && styles.addedCount]}>
          {isLoading ? '...' : addCount}
        </Text>
      </Pressable>
    </View>
  );
};

interface ExploreProps {
  searchTerm: string;
  showToast: (message: string) => void;
  addedEventIds: Set<string>;
  onEventAdded: (flyerId: string) => void;
  onEventRemoved: (flyerId: string) => void;
}

const Explore: React.FC<ExploreProps> = ({ 
  searchTerm, 
  showToast, 
  addedEventIds, 
  onEventAdded, 
  onEventRemoved 
}) => {
  const { user } = useAuth();
  const userEmail = user?.email ?? null;
  const [flyers, setFlyers] = useState<Flyer[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | 'All'>('All');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorText, setErrorText] = useState<string | null>(null);
  const isSharingRef = useRef(false);

  const fetchStorageFlyers = useCallback(async () => {
    setIsLoading(true);
    setErrorText(null);
    try {
      const { data, error } = await supabase
        .from('upload_pdf')
        .select('id, title, description, image_url, image_id, date_and_time, categories, location, organization, created_at')
        .order('date_and_time', { ascending: true });

      if (error) throw error;

      const mappedFlyers: Flyer[] = ((data ?? []) as UploadPdfRow[])
        .filter((row): row is UploadPdfRow & { image_url: string } => Boolean(row.image_url))
        .map(row => {
          const parsedCategories = parseCategories(row.categories);
          return {
            id: String(row.id ?? row.image_id ?? row.image_url),
            title: row.title?.trim() || 'Untitled Event',
            description: row.description?.trim() || '',
            imageUrl: row.image_url,
            eventDate: normalizeEventDate(row.date_and_time, row.created_at),
            category: parsedCategories[0],
            categories: parsedCategories,
            likes: 0,
            dislikes: 0,
            uploader: { id: 'supabase-upload', name: row.organization || 'Community' },
            location: row.location ?? '',
            organization: row.organization ?? '',
          };
        })
        .filter((flyer): flyer is Flyer => {
          const ext = extractExtension(flyer.imageUrl);
          return Boolean(!ext || SUPPORTED_EXTENSIONS.includes(ext));
        });

      setFlyers(mappedFlyers);
    } catch (err) {
      console.error('Unexpected error loading flyers', err);
      setErrorText((err as Error)?.message ?? 'Unable to load flyers');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStorageFlyers();
  }, [fetchStorageFlyers]);

  const filteredFlyers = useMemo(() => {
    let result = [...flyers].sort((a, b) => (b.likes - b.dislikes) - (a.likes - a.dislikes));
    if (selectedCategory !== 'All') {
      result = result.filter(flyer => flyer.category === selectedCategory);
    }
    if (searchTerm) {
      result = result.filter(flyer =>
        flyer.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        flyer.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return result;
  }, [flyers, selectedCategory, searchTerm]);

  const handleToggleAdded = (flyerId: string, newState: boolean) => {
    if (newState) {
      onEventAdded(flyerId);
    } else {
      onEventRemoved(flyerId);
    }
  };

  const handleImageClick = (imageUrl: string) => {
    console.log('Image clicked:', imageUrl);
    setSelectedImage(imageUrl);
  };

  const handleShare = useCallback(async (flyer: Flyer) => {
    if (isSharingRef.current) {
      return;
    }

    isSharingRef.current = true;
    let downloadedUri: string | null = null;

    try {
      const sharingAvailable = await Sharing.isAvailableAsync();
      if (!sharingAvailable) {
        showToast('Sharing is not available on this device');
        return;
      }

      const extension = extractExtension(flyer.imageUrl) ?? extractExtension(flyer.id) ?? 'pdf';
      const mimeType = resolveMimeType(extension);
      const uti = resolveUti(extension);

      const safeName = sanitizeFileBaseName(flyer.title || 'event-flyer');
      const downloadTarget = `${FileSystem.cacheDirectory}${safeName}.${extension}`;

      const download = await FileSystem.downloadAsync(flyer.imageUrl, downloadTarget);
      downloadedUri = download.uri;

      await Sharing.shareAsync(download.uri, {
        mimeType,
        dialogTitle: `Share ${flyer.title || 'Event Flyer'}`,
        UTI: uti,
        message: `Look at the event I just found in Eventuality! ${flyer.title ? `\n\n${flyer.title}` : ''}`,
      });
    } catch (err) {
      console.error('Failed to share flyer', err);
      showToast('Unable to share flyer');
    } finally {
      isSharingRef.current = false;
      if (downloadedUri) {
        await FileSystem.deleteAsync(downloadedUri, { idempotent: true }).catch(() => undefined);
      }
    }
  }, [showToast]);

  return (
    <View style={styles.container}>
      <FilterBar selectedCategory={selectedCategory} onSelectCategory={setSelectedCategory} />
      <FlatList
        data={filteredFlyers}
        renderItem={({ item }) => (
          <FlyerListItem 
            flyer={item} 
            onImageClick={handleImageClick}
            onLongPressShare={handleShare}
            onShowToast={showToast}
            isAdded={addedEventIds.has(item.id)}
            onToggleAdded={handleToggleAdded}
            userEmail={userEmail}
          />
        )}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {isLoading
                ? 'Loading flyers...'
                : errorText
                ? errorText
                : 'No events found.'}
            </Text>
          </View>
        )}
      />
      
      <Modal 
        visible={!!selectedImage} 
        transparent={true} 
        animationType="fade" 
        onRequestClose={() => setSelectedImage(null)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable 
            style={StyleSheet.absoluteFill} 
            onPress={() => setSelectedImage(null)} 
          />
          <View style={styles.modalContent}>
            {selectedImage ? (
              <Image 
                source={{ uri: selectedImage }} 
                style={styles.modalImage} 
                resizeMode="contain"
                onError={(error) => console.log('Image load error:', error.nativeEvent)}
                onLoad={() => console.log('Image loaded successfully')}
              />
            ) : null}
            <Pressable onPress={() => setSelectedImage(null)} style={styles.closeButton}>
              <Icon name="x" className="w-6 h-6" color="white" />
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#1c1917' },
    itemContainer: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(41, 37, 36, 0.7)' },
    itemImage: { width: 96, height: 128, borderRadius: 8 },
    itemDetails: { flex: 1, overflow: 'hidden' },
    itemCategory: { color: '#a855f7', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5 },
    itemTitle: { color: '#f5f5f4', fontWeight: 'bold', fontSize: 18, marginTop: 4 },
    itemDate: { color: '#a8a29e', fontSize: 14, marginTop: 4 },
    addButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, width: 80, height: 40, borderRadius: 9999, backgroundColor: 'rgba(41, 37, 36, 0.6)' },
    addedButton: { backgroundColor: 'rgba(168, 85, 247, 0.2)' },
    loadingButton: { opacity: 0.6 },
    addCount: { color: '#a8a29e', fontSize: 14, fontWeight: 'bold' },
    addedCount: { color: '#a855f7' },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
    emptyText: { color: '#78716c' },
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.95)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: '90%', height: '70%', justifyContent: 'center', alignItems: 'center', position: 'relative' },
    modalImage: { width: '100%', height: '100%', borderRadius: 12, backgroundColor: '#292524' },
    closeButton: { position: 'absolute', top: -16, right: -16, backgroundColor: '#292524', padding: 8, borderRadius: 9999, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.5, shadowRadius: 4, elevation: 5 },
});

export default Explore;
