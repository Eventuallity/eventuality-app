import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Image, Pressable, Modal } from 'react-native';
import { Flyer, Category } from '.././types';
import { MOCK_FLYERS } from '.././constants';
import FilterBar from './FilterBar';
import Icon from './Icon';

const FlyerListItem: React.FC<{ flyer: Flyer; onImageClick: (imageUrl: string) => void }> = ({ flyer, onImageClick }) => {
  const [isAdded, setIsAdded] = useState(false);
  const [addCount, setAddCount] = useState(flyer.likes);

  const handleAdd = () => {
    setIsAdded(prev => !prev);
    setAddCount(prev => isAdded ? prev - 1 : prev + 1);
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
      <Pressable onPress={handleAdd} style={[styles.addButton, isAdded && styles.addedButton]}>
        <Icon name="calendar" className="w-5 h-5" color={isAdded ? '#a855f7' : '#a8a29e'} />
        <Text style={[styles.addCount, isAdded && styles.addedCount]}>{addCount}</Text>
      </Pressable>
    </View>
  );
};

interface ExploreProps {
  searchTerm: string;
}

const Explore: React.FC<ExploreProps> = ({ searchTerm }) => {
  const [flyers] = useState<Flyer[]>(MOCK_FLYERS);
  const [selectedCategory, setSelectedCategory] = useState<Category | 'All'>('All');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

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

  return (
    <View style={styles.container}>
      <FilterBar selectedCategory={selectedCategory} onSelectCategory={setSelectedCategory} />
      <FlatList
        data={filteredFlyers}
        renderItem={({ item }) => <FlyerListItem flyer={item} onImageClick={setSelectedImage} />}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No events found.</Text>
            </View>
        )}
      />
      
      <Modal visible={!!selectedImage} transparent={true} animationType="fade" onRequestClose={() => setSelectedImage(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setSelectedImage(null)}>
          <View style={styles.modalContent}>
            <Image source={{ uri: selectedImage || undefined }} style={styles.modalImage} resizeMode="contain" />
            <Pressable onPress={() => setSelectedImage(null)} style={styles.closeButton}>
              <Icon name="x" className="w-6 h-6" color="white" />
            </Pressable>
          </View>
        </Pressable>
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
    addCount: { color: '#a8a29e', fontSize: 14, fontWeight: 'bold' },
    addedCount: { color: '#a855f7' },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
    emptyText: { color: '#78716c' },
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.8)', justifyContent: 'center', alignItems: 'center', padding: 16 },
    modalContent: {},
    modalImage: { width: '100%', height: '90%', borderRadius: 12 },
    closeButton: { position: 'absolute', top: -12, right: -12, backgroundColor: 'rgba(41, 37, 36, 0.8)', padding: 8, borderRadius: 9999 },
});

export default Explore;
