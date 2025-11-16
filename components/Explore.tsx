import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { FlatList, Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Category, Flyer } from '../types';
import { addEventToCalendar } from '../utils/calendar';
import { supabase } from '../supabase-client';
import FilterBar from './FilterBar';
import Icon from './Icon';

const FlyerListItem: React.FC<{ 
  flyer: Flyer; 
  onImageClick: (imageUrl: string) => void;
  onShowToast: (message: string) => void;
  isAdded: boolean;
  onToggleAdded: (flyerId: string, newState: boolean) => void;
}> = ({ flyer, onImageClick, onShowToast, isAdded, onToggleAdded }) => {
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
      <Pressable onPress={() => onImageClick(flyer.imageUrl)}>
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
  const [flyers, setFlyers] = useState<Flyer[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | 'All'>('All');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
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
            category: Category.OTHER,
            likes: 0,
            dislikes: 0,
            uploader: { id: 'supabase-storage', name: 'Supabase Storage' },
          };
        })
        .filter((flyer): flyer is Flyer => Boolean(flyer));

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

  return (
    <View style={styles.container}>
      <FilterBar selectedCategory={selectedCategory} onSelectCategory={setSelectedCategory} />
      <FlatList
        data={filteredFlyers}
        renderItem={({ item }) => (
          <FlyerListItem 
            flyer={item} 
            onImageClick={handleImageClick}
            onShowToast={showToast}
            isAdded={addedEventIds.has(item.id)}
            onToggleAdded={handleToggleAdded}
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
