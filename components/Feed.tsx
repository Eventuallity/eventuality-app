import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { Category, Flyer } from '.././types';
import { supabase } from '../supabase-client';
import { addEventToCalendar } from '../utils/calendar';
import FlyerCard from './FlyerCard';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

interface FeedProps {
  initialFlyers: Flyer[];
  showToast: (message: string) => void;
  addedEventIds: Set<string>;
  onEventAdded: (flyerId: string) => void;
}

const SUPPORTED_EXTENSIONS = ['pdf', 'png', 'jpg', 'jpeg', 'webp', 'heic', 'heif'];

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

const Feed: React.FC<FeedProps> = ({ initialFlyers, showToast, addedEventIds, onEventAdded }) => {
  const [flyers, setFlyers] = useState<Flyer[]>([]);
  const [storageFlyers, setStorageFlyers] = useState<Flyer[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [errorText, setErrorText] = useState<string | null>(null);
  const isSharingRef = useRef(false);

  const fetchStorageFlyers = useCallback(async () => {
    setIsLoading(true);
    setErrorText(null);
    try {
      const listAll = async (path: string): Promise<{ path: string; name: string; created_at?: string | null; updated_at?: string | null }[]> => {
        const { data, error } = await supabase.storage
          .from('flyers')
          .list(path, { limit: 1000, sortBy: { column: 'name', order: 'asc' } });
        if (error) throw error;

        const collected: { path: string; name: string; created_at?: string | null; updated_at?: string | null }[] = [];
        for (const item of data ?? []) {
          const fullPath = path ? `${path}/${item.name}` : item.name;
          const isFolder = !item.id && !item.metadata;
          if (isFolder) {
            collected.push(...(await listAll(fullPath)));
          } else {
            collected.push({ path: fullPath, name: item.name, created_at: item.created_at, updated_at: item.updated_at });
          }
        }
        return collected;
      };

      const files = await listAll('');

      const mappedFlyers: Flyer[] = files
        .filter(file => {
          const ext = extractExtension(file.name);
          return Boolean(ext && SUPPORTED_EXTENSIONS.includes(ext));
        })
        .map(file => {
          const { data: publicUrlData } = supabase.storage.from('flyers').getPublicUrl(file.path);
          const publicUrl = publicUrlData?.publicUrl;
          if (!publicUrl) return null;

          return {
            id: file.path,
            title: file.name.replace(/\.[^/.]+$/, ''),
            description: 'Flyer uploaded by the community.',
            imageUrl: publicUrl,
            eventDate: new Date(file.updated_at ?? file.created_at ?? Date.now()).toISOString(),
            category: Category.OTHER,
            likes: 0,
            dislikes: 0,
            uploader: { id: 'supabase-storage', name: 'Supabase Storage' },
          };
        })
        .filter((flyer): flyer is Flyer => Boolean(flyer));

      setStorageFlyers(mappedFlyers);
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

  // When a new local upload is registered, re-pull from storage so the feed has the
  // authoritative set (including uploads from other users/sessions).
  useEffect(() => {
    if (initialFlyers.length > 0) {
      fetchStorageFlyers();
    }
  }, [initialFlyers.length, fetchStorageFlyers]);

  useEffect(() => {
    const allFlyers = [...initialFlyers, ...storageFlyers];
    const uniqueFlyers = Array.from(new Set(allFlyers.map(f => f.id))).map(id => allFlyers.find(f => f.id === id));
    const sortedFlyers = (uniqueFlyers as Flyer[]).sort((a, b) => (b.likes - b.dislikes) - (a.likes - a.dislikes));
    setFlyers(sortedFlyers);
    setCurrentIndex(0);
    if (sortedFlyers.length > 0) {
      setIsLoading(false);
    }
  }, [initialFlyers, storageFlyers]);

  const handleSwipe = async (direction: 'right' | 'left') => {
    if (direction === 'right') {
      const currentFlyer = flyers[currentIndex];
      
      // Calculate end date (assume 2 hours after start)
      const startDate = new Date(currentFlyer.eventDate);
      const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);
      
      const success = await addEventToCalendar({
        title: currentFlyer.title,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        location: currentFlyer.location,
        description: currentFlyer.description
      });
      
      if (success) {
        onEventAdded(currentFlyer.id);
        showToast('Added to calendar');
      } else {
        showToast('Failed to add to calendar');
      }
    }
    setCurrentIndex((prevIndex) => (prevIndex + 1) % flyers.length);
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

  if (flyers.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>
          {isLoading ? 'Loading flyers...' : errorText ? errorText : 'No flyers uploaded yet.'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.cardContainer}>
        {flyers.map((flyer, index) => {
          if (index < currentIndex) return null;
          return (
            <FlyerCard
              key={flyer.id}
              flyer={flyer}
              isActive={index === currentIndex}
              onSwipe={handleSwipe}
              onLongPress={handleShare}
            />
          );
        }).reverse()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#1c1917',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#78716c',
  },
  container: {
    flex: 1,
    backgroundColor: '#1c1917',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    padding: 16,
  },
  cardContainer: {
    width: '100%',
    height: '100%',
    maxHeight: '85%',
    maxWidth: 400,
  },
});

export default Feed;
