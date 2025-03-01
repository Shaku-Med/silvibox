// File: app/index.tsx (updated with refresh functionality)
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import AppHeader from './AppHeader';

export default function HomeScreen() {
  const [currentPath, setCurrentPath] = useState(FileSystem.documentDirectory);
  const [items, setItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Load contents when the screen comes into focus or path changes
  useFocusEffect(
    useCallback(() => {
      loadContents();
    }, [currentPath])
  );

  const loadContents = async () => {
    try {
      const contents = await FileSystem.readDirectoryAsync(currentPath);
      const itemsWithInfo = await Promise.all(
        contents.map(async (name) => {
          const uri = `${currentPath}${name}`;
          const info = await FileSystem.getInfoAsync(uri);
          return {
            name,
            uri,
            isDirectory: info.isDirectory,
            size: info.size,
            modificationTime: info.modificationTime,
          };
        })
      );
      
      // Sort directories first, then files
      const sortedItems = itemsWithInfo.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });
      
      setItems(sortedItems);
    } catch (error) {
      Alert.alert('Error', `Failed to load contents: ${error.message}`);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadContents();
    setRefreshing(false);
  }, [currentPath]);

  const navigateUp = () => {
    if (currentPath === FileSystem.documentDirectory) return;
    
    // Remove trailing slash
    const path = currentPath.endsWith('/')
      ? currentPath.slice(0, -1)
      : currentPath;
    
    // Get parent directory
    const parts = path.split('/');
    parts.pop();
    const parentPath = parts.join('/') + '/';
    
    setCurrentPath(parentPath);
  };

  const handleItemPress = async (item) => {
    if (isSelectionMode) {
      toggleItemSelection(item);
      return;
    }

    if (item.isDirectory) {
      setCurrentPath(`${item.uri}/`);
    } else {
      // Preview file
      router.push({
        pathname: '/preview',
        params: { uri: item.uri, name: item.name }
      });
    }
  };

  const toggleItemSelection = (item) => {
    if (selectedItems.some(i => i.uri === item.uri)) {
      setSelectedItems(selectedItems.filter(i => i.uri !== item.uri));
    } else {
      setSelectedItems([...selectedItems, item]);
    }
  };

  const handleLongPress = (item) => {
    setIsSelectionMode(true);
    toggleItemSelection(item);
  };

  const createNewFolder = () => {
    router.push({
      pathname: '/new-folder',
      params: { currentPath }
    });
  };

  const uploadFile = () => {
    router.push({
      pathname: '/upload',
      params: { currentPath }
    });
  };

  const deleteSelected = async () => {
    if (selectedItems.length === 0) return;

    Alert.alert(
      'Delete Items',
      `Are you sure you want to delete ${selectedItems.length} item(s)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await Promise.all(
                selectedItems.map(item => FileSystem.deleteAsync(item.uri))
              );
              setSelectedItems([]);
              setIsSelectionMode(false);
              loadContents();
            } catch (error) {
              Alert.alert('Error', `Failed to delete: ${error.message}`);
            }
          }
        }
      ]
    );
  };

  const renameSelected = () => {
    if (selectedItems.length !== 1) {
      Alert.alert('Error', 'Please select exactly one item to rename');
      return;
    }

    router.push({
      pathname: '/rename',
      params: { 
        uri: selectedItems[0].uri,
        name: selectedItems[0].name,
        currentPath
      }
    });
  };

  const shareSelected = async () => {
    if (selectedItems.length !== 1 || selectedItems[0].isDirectory) {
      Alert.alert('Error', 'Please select exactly one file to share');
      return;
    }

    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Error', 'Sharing is not available on this device');
        return;
      }
      
      await Sharing.shareAsync(selectedItems[0].uri);
    } catch (error) {
      Alert.alert('Error', `Failed to share: ${error.message}`);
    }
  };

  const cancelSelection = () => {
    setSelectedItems([]);
    setIsSelectionMode(false);
  };

  const renderItem = ({ item }) => {
    const isSelected = selectedItems.some(i => i.uri === item.uri);
    
    return (
      <TouchableOpacity
        style={[styles.item, isSelected && styles.selectedItem]}
        onPress={() => handleItemPress(item)}
        onLongPress={() => handleLongPress(item)}
      >
        <Ionicons
          name={item.isDirectory ? 'folder' : 'document-text'}
          size={24}
          color={item.isDirectory ? '#FFD700' : '#6200EE'}
          style={styles.icon}
        />
        <View style={styles.itemInfo}>
          <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
          {!item.isDirectory && (
            <Text style={styles.itemDetails}>
              {formatSize(item.size)} • {formatDate(item.modificationTime)}
            </Text>
          )}
        </View>
        {isSelectionMode && (
          <Ionicons
            name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
            size={24}
            color="#6200EE"
          />
        )}
      </TouchableOpacity>
    );
  };

  const formatSize = (bytes) => {
    if (bytes === undefined) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString();
  };

  return (
    <View style={styles.container}>
      <AppHeader
        title={getHeaderTitle()}
        showBack={currentPath !== FileSystem.documentDirectory}
        onBack={navigateUp}
        isSelectionMode={isSelectionMode}
        selectedCount={selectedItems.length}
        onCancelSelection={cancelSelection}
        onDelete={deleteSelected}
        onRename={renameSelected}
        onShare={shareSelected}
        onRefresh={onRefresh}
      />
      
      {items.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="folder-open-outline" size={64} color="#6200EE" />
          <Text style={styles.emptyText}>This folder is empty</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={(item) => item.uri}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#6200EE']}
              tintColor="#6200EE"
            />
          }
        />
      )}
      
      {!isSelectionMode && (
        <View style={styles.fabContainer}>
          <TouchableOpacity style={[styles.fab, styles.fabUpload]} onPress={uploadFile}>
            <Ionicons name="cloud-upload" size={24} color="white" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.fab} onPress={createNewFolder}>
            <Ionicons name="folder-open" size={24} color="white" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  function getHeaderTitle() {
    if (currentPath === FileSystem.documentDirectory) {
      return 'My Files';
    }
    
    const pathParts = currentPath.split('/');
    return pathParts[pathParts.length - 2] || 'My Files';
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  list: {
    padding: 10,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    elevation: 1,
  },
  selectedItem: {
    backgroundColor: '#E8E0FF',
  },
  icon: {
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '500',
  },
  itemDetails: {
    fontSize: 12,
    color: '#757575',
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#757575',
  },
  fabContainer: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6200EE',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    marginTop: 16,
  },
  fabUpload: {
    backgroundColor: '#03A9F4',
  },
});