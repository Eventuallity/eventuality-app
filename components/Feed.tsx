import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Category, Flyer } from '.././types';
import { supabase } from '../supabase-client';
import { addEventToCalendar } from '../utils/calendar';
import FlyerCard from './FlyerCard';

interface FeedProps {
  initialFlyers: Flyer[];
  showToast: (message: string) => void;
  addedEventIds: Set<string>;
  onEventAdded: (flyerId: string) => void;
}

const Feed: React.FC<FeedProps> = ({ initialFlyers, showToast, addedEventIds, onEventAdded }) => {
  const [flyers, setFlyers] = useState<Flyer[]>([]);
  const [storageFlyers, setStorageFlyers] = useState<Flyer[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [errorText, setErrorText] = useState<string | null>(null);

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
        .filter(file => file.name.toLowerCase().endsWith('.pdf'))
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
            category: Category.AD,
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
