import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Text,
  ActivityIndicator,
  Platform,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { searchPlaces } from '../../services/mapService';
import { Location } from '../../types';

interface LocationBarProps {
  label: string;
  placeholder: string;
  value: string;
  onLocationSelect: (location: Location) => void;
  icon: keyof typeof Ionicons.glyphMap;
  zIndexOffset?: number; // Higher for pickup, lower for dropoff
}

interface Prediction {
  id: string;
  displayName: string;
  shortName: string;
  latitude: number;
  longitude: number;
}

const LocationBar: React.FC<LocationBarProps> = ({
  label,
  placeholder,
  value,
  onLocationSelect,
  icon,
  zIndexOffset = 0,
}) => {
  const [query, setQuery] = useState(value);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showPredictions, setShowPredictions] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<TextInput>(null);

  // Sync query with external value changes (e.g., when current location is set)
  useEffect(() => {
    setQuery(value);
  }, [value]);

  const handleSearch = async (text: string) => {
    setQuery(text);

    if (text.length < 3) {
      setPredictions([]);
      setShowPredictions(false);
      return;
    }

    // Debounce search to avoid too many API calls
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const results = await searchPlaces(text, 'in');
        const formattedResults: Prediction[] = results.map((r) => ({
          id: r.id,
          displayName: r.displayName,
          shortName: r.shortName,
          latitude: r.latitude,
          longitude: r.longitude,
        }));
        setPredictions(formattedResults);
        setShowPredictions(true);
      } catch (error) {
        console.error('Error fetching places:', error);
      } finally {
        setIsLoading(false);
      }
    }, 300);
  };

  const selectPlace = (prediction: Prediction) => {
    onLocationSelect({
      latitude: prediction.latitude,
      longitude: prediction.longitude,
      address: prediction.shortName,
    });
    setQuery(prediction.shortName);
    setShowPredictions(false);
    setPredictions([]);
    Keyboard.dismiss();
  };

  const handleFocus = () => {
    setIsFocused(true);
    if (query.length >= 3 && predictions.length > 0) {
      setShowPredictions(true);
    }
  };

  const handleBlur = () => {
    // Small delay to allow touch on prediction item
    setTimeout(() => {
      setIsFocused(false);
      setShowPredictions(false);
    }, 200);
  };

  const clearInput = () => {
    setQuery('');
    setPredictions([]);
    setShowPredictions(false);
    inputRef.current?.focus();
  };

  // Dynamic z-index: higher when focused
  const containerZIndex = isFocused ? 1000 + zIndexOffset : 10 + zIndexOffset;

  return (
    <View style={[styles.container, { zIndex: containerZIndex }]}>
      <View style={styles.inputContainer}>
        <Ionicons name={icon} size={20} color={isFocused ? '#00D9FF' : '#666'} style={styles.icon} />
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor="#666"
          value={query}
          onChangeText={handleSearch}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
        {isLoading && <ActivityIndicator size="small" color="#00D9FF" style={styles.loader} />}
        {query.length > 0 && !isLoading && (
          <TouchableOpacity onPress={clearInput} style={styles.clearButton}>
            <Ionicons name="close-circle" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      {showPredictions && predictions.length > 0 && (
        <View style={styles.predictionsContainer}>
          <FlatList
            data={predictions}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="always"
            nestedScrollEnabled
            showsVerticalScrollIndicator={true}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.predictionItem}
                onPress={() => selectPlace(item)}
                activeOpacity={0.7}
              >
                <View style={styles.predictionIcon}>
                  <Ionicons name="location-outline" size={18} color="#00D9FF" />
                </View>
                <View style={styles.predictionTextContainer}>
                  <Text style={styles.predictionTitle} numberOfLines={1}>
                    {item.shortName}
                  </Text>
                  <Text style={styles.predictionSubtitle} numberOfLines={1}>
                    {item.displayName}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
            style={styles.predictionsList}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0d0d0d',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'web' ? 12 : 10,
    borderWidth: 1,
    borderColor: '#222',
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#FFFFFF',
    ...(Platform.OS === 'web' && { outlineStyle: 'none' }),
  },
  loader: {
    marginLeft: 8,
  },
  clearButton: {
    padding: 4,
    marginLeft: 4,
  },
  predictionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    backgroundColor: '#111111',
    borderRadius: 12,
    maxHeight: 250,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#222',
    overflow: 'hidden',
  },
  predictionsList: {
    flex: 1,
  },
  predictionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  predictionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 217, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  predictionTextContainer: {
    flex: 1,
  },
  predictionTitle: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  predictionSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
});

export default LocationBar;
