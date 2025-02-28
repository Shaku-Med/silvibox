// app/index.js
import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  FlatList, 
  TouchableOpacity, 
  Modal, 
  TextInput,
  Alert,
  ActivityIndicator,
  Dimensions,
  Image,
  SafeAreaView
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const router = useRouter();
  const params: any = useLocalSearchParams();
  
  // Get the current path from URL params or use default
  const [currentPath, setCurrentPath] = useState<any>(
    params.path ? decodeURIComponent(params.path) : FileSystem.documentDirectory
  );
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [itemToRename, setItemToRename] = useState(null);
  const [newName, setNewName] = useState('');
  const [showActionMenu, setShowActionMenu] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'This app needs permission to access your media library to save files.');
      }
    })();
    
    loadContents();
  }, [currentPath]);

  const loadContents = async () => {
    setLoading(true);
    try {
      const contents = await FileSystem.readDirectoryAsync(currentPath);
      const itemDetails = await Promise.all(
        contents.map(async (name) => {
          const uri = `${currentPath}${name}`;
          const info: any = await FileSystem.getInfoAsync(uri);
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
      const sortedItems: any = itemDetails.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });
      
      setItems(sortedItems);
    } catch (error) {
      console.error('Error loading directory contents:', error);
      Alert.alert('Error', 'Failed to load contents');
    } finally {
      setLoading(false);
    }
  };

  const navigateToFolder = (folderUri) => {
    const nextPath = folderUri.endsWith('/') ? folderUri : `${folderUri}/`;
    // Use router to navigate with the path parameter
    router.push({
      pathname: '/',
      params: { path: encodeURIComponent(nextPath) }
    });
    setCurrentPath(nextPath);
    setSelectedItems([]);
  };

  const navigateUp = () => {
    if (currentPath === FileSystem.documentDirectory) return;
    
    const pathParts = currentPath.split('/');
    pathParts.pop(); // Remove empty string from trailing slash
    pathParts.pop(); // Remove current directory
    const newPath = pathParts.join('/') + '/';
    
    // Use router to navigate with the new path parameter
    router.push({
      pathname: '/',
      params: { path: encodeURIComponent(newPath) }
    });
    setCurrentPath(newPath);
    setSelectedItems([]);
  };

  const navigateToPreview = (item) => {
    if (item.isDirectory) return;
    
    // Navigate to the preview screen with file information
    router.push({
      pathname: '/(home)/(tabs)/preview',
      params: { 
        uri: encodeURIComponent(item.uri),
        name: encodeURIComponent(item.name)
      }
    });
  };

  const createFolder = async () => {
    if (!newFolderName.trim()) {
      Alert.alert('Error', 'Folder name cannot be empty');
      return;
    }
    
    const folderUri = `${currentPath}${newFolderName.trim()}`;
    
    try {
      await FileSystem.makeDirectoryAsync(folderUri, { intermediates: true });
      setModalVisible(false);
      setNewFolderName('');
      loadContents();
    } catch (error) {
      console.error('Error creating folder:', error);
      Alert.alert('Error', 'Failed to create folder');
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        type: '*/*',
      });
      
      if (result.type === 'success') {
        const destUri = `${currentPath}${result.name}`;
        await FileSystem.copyAsync({
          from: result.uri,
          to: destUri,
        });
        loadContents();
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to upload file');
    }
  };

  const deleteItems = async () => {
    if (selectedItems.length === 0) return;
    
    Alert.alert(
      'Confirm Deletion',
      `Are you sure you want to delete ${selectedItems.length} item(s)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await Promise.all(
                selectedItems.map((item) => FileSystem.deleteAsync(item.uri))
              );
              setSelectedItems([]);
              loadContents();
              setShowActionMenu(false);
            } catch (error) {
              console.error('Error deleting items:', error);
              Alert.alert('Error', 'Failed to delete items');
            }
          },
        },
      ]
    );
  };

  const renameItem = async () => {
    if (!newName.trim() || !itemToRename) {
      Alert.alert('Error', 'Name cannot be empty');
      return;
    }

    const newUri = `${currentPath}${newName.trim()}`;
    
    try {
      await FileSystem.moveAsync({
        from: itemToRename.uri,
        to: newUri,
      });
      setRenameModalVisible(false);
      setItemToRename(null);
      setNewName('');
      loadContents();
      setShowActionMenu(false);
    } catch (error) {
      console.error('Error renaming item:', error);
      Alert.alert('Error', 'Failed to rename item');
    }
  };

  const toggleSelect = (item) => {
    if (selectedItems.some((selected) => selected.uri === item.uri)) {
      setSelectedItems(selectedItems.filter((selected) => selected.uri !== item.uri));
    } else {
      setSelectedItems([...selectedItems, item]);
    }
    
    // Show action menu when items are selected
    if (selectedItems.length === 0 && !selectedItems.some((selected) => selected.uri === item.uri)) {
      setShowActionMenu(true);
    } else if (selectedItems.length === 1 && selectedItems.some((selected) => selected.uri === item.uri)) {
      setShowActionMenu(false);
    }
  };

  const clearSelection = () => {
    setSelectedItems([]);
    setShowActionMenu(false);
  };

  const getIconForFile = (fileName) => {
    const extension = fileName.split('.').pop().toLowerCase();
    
    switch (extension) {
      case 'pdf':
        return { name: 'file-pdf-box', color: '#FF5252' };
      case 'doc':
      case 'docx':
        return { name: 'file-word', color: '#2196F3' };
      case 'xls':
      case 'xlsx':
        return { name: 'file-excel', color: '#4CAF50' };
      case 'ppt':
      case 'pptx':
        return { name: 'file-powerpoint', color: '#FF9800' };
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return { name: 'file-image', color: '#9C27B0' };
      case 'mp3':
      case 'wav':
      case 'ogg':
        return { name: 'file-music', color: '#00BCD4' };
      case 'mp4':
      case 'mov':
      case 'avi':
        return { name: 'file-video', color: '#E91E63' };
      case 'zip':
      case 'rar':
      case '7z':
        return { name: 'zip-box', color: '#795548' };
      case 'txt':
      case 'md':
        return { name: 'file-document', color: '#607D8B' };
      case 'js':
      case 'json':
      case 'html':
      case 'css':
        return { name: 'code-tags', color: '#FF9800' };
      default:
        return { name: 'file-outline', color: '#9E9E9E' };
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const renderItem = ({ item }) => {
    const isSelected = selectedItems.some((selected) => selected.uri === item.uri);
    const icon = item.isDirectory 
      ? { name: 'folder', color: '#FFD700' }
      : getIconForFile(item.name);
    
    return (
      <TouchableOpacity
        style={[styles.item, isSelected && styles.selectedItem]}
        onPress={() => {
          if (selectedItems.length > 0) {
            toggleSelect(item);
          } else if (item.isDirectory) {
            navigateToFolder(item.uri);
          } else {
            navigateToPreview(item);
          }
        }}
        onLongPress={() => toggleSelect(item)}
      >
        <View style={styles.itemContent}>
          <View style={[styles.iconContainer, { backgroundColor: `${icon.color}20` }]}>
            <MaterialCommunityIcons
              name={icon.name}
              size={26}
              color={icon.color}
            />
          </View>
          
          <View style={styles.itemDetails}>
            <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
            {!item.isDirectory && (
              <Text style={styles.itemSize}>
                {formatFileSize(item.size)}
              </Text>
            )}
          </View>
          
          {isSelected ? (
            <View style={styles.checkCircle}>
              <Feather name="check" size={16} color="#FFFFFF" />
            </View>
          ) : (
            <TouchableOpacity
              style={styles.itemMenu}
              onPress={() => {
                setSelectedItems([item]);
                setShowActionMenu(true);
              }}
            >
              <Feather name="more-vertical" size={20} color="#9E9E9E" />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderFooter = () => {
    if (items.length === 0 && !loading) {
      return (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="folder-open-outline" size={80} color="#DADADA" />
          <Text style={styles.emptyText}>This folder is empty</Text>
        </View>
      );
    }
    return null;
  };

  const renderSelectedBar = () => {
    if (selectedItems.length === 0) return null;

    return (
      <View style={styles.selectedBar}>
        <View style={styles.selectedInfo}>
          <TouchableOpacity onPress={clearSelection} style={styles.closeButton}>
            <Feather name="x" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.selectedText}>
            {selectedItems.length} {selectedItems.length === 1 ? 'item' : 'items'} selected
          </Text>
        </View>
        
        <View style={styles.selectedActions}>
          <TouchableOpacity onPress={deleteItems} style={styles.selectedAction}>
            <Feather name="trash" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          
          {selectedItems.length === 1 && (
            <>
              <TouchableOpacity 
                style={styles.selectedAction}
                onPress={() => {
                  setItemToRename(selectedItems[0]);
                  setNewName(selectedItems[0].name);
                  setRenameModalVisible(true);
                }}
              >
                <Feather name="edit-2" size={20} color="#FFFFFF" />
              </TouchableOpacity>
              
              {!selectedItems[0].isDirectory && (
                <TouchableOpacity 
                  style={styles.selectedAction}
                  onPress={() => {
                    router.push({
                      pathname: '/share',
                      params: { uri: encodeURIComponent(selectedItems[0].uri) }
                    });
                  }}
                >
                  <Feather name="share" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{
          title: "Files",
          headerLeft: () => 
            currentPath !== FileSystem.documentDirectory ? (
              <TouchableOpacity onPress={navigateUp} style={styles.backButton}>
                <Feather name="arrow-left" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            ) : null,
          headerRight: () => (
            <View style={styles.headerRight}>
              {selectedItems.length === 0 && (
                <>
                  <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.headerButton}>
                    <Feather name="folder-plus" size={22} color="#FFFFFF" />
                  </TouchableOpacity>
                  
                  <TouchableOpacity onPress={pickDocument} style={styles.headerButton}>
                    <Feather name="upload" size={22} color="#FFFFFF" />
                  </TouchableOpacity>
                </>
              )}
            </View>
          ),
        }}
      />
      
      <View style={styles.pathContainer}>
        <Text style={styles.pathText} numberOfLines={1}>
          {currentPath === FileSystem.documentDirectory 
            ? 'Home' 
            : currentPath.replace(FileSystem.documentDirectory, 'Home/')}
        </Text>
      </View>
      
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#6200EE" />
        </View>
      ) : (
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={(item) => item.uri}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          ListFooterComponent={renderFooter}
          showsVerticalScrollIndicator={false}
        />
      )}
      
      {renderSelectedBar()}
      
      {/* Create Folder Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create New Folder</Text>
            <TextInput
              style={styles.input}
              placeholder="Folder Name"
              value={newFolderName}
              onChangeText={setNewFolderName}
              autoFocus
              placeholderTextColor="#9E9E9E"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setModalVisible(false);
                  setNewFolderName('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.createButton]}
                onPress={createFolder}
              >
                <Text style={styles.createButtonText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Rename Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={renameModalVisible}
        onRequestClose={() => setRenameModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Rename</Text>
            <TextInput
              style={styles.input}
              placeholder="New Name"
              value={newName}
              onChangeText={setNewName}
              autoFocus
              placeholderTextColor="#9E9E9E"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setRenameModalVisible(false);
                  setItemToRename(null);
                  setNewName('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.createButton]}
                onPress={renameItem}
              >
                <Text style={styles.createButtonText}>Rename</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  backButton: {
    marginLeft: 10,
  },
  headerRight: {
    flexDirection: 'row',
  },
  headerButton: {
    marginHorizontal: 10,
    padding: 5,
  },
  pathContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  pathText: {
    fontSize: 14,
    color: '#666666',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingTop: 5,
    paddingBottom: 20,
  },
  item: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 10,
    marginVertical: 5,
    borderRadius: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  selectedItem: {
    backgroundColor: '#EDE7F6',
    borderWidth: 2,
    borderColor: '#6200EE',
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  itemName: {
    fontSize: 16,
    color: '#333333',
    marginBottom: 4,
  },
  itemSize: {
    fontSize: 13,
    color: '#888888',
  },
  itemMenu: {
    padding: 5,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#6200EE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedBar: {
    backgroundColor: '#6200EE',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderTopWidth: 1,
    borderTopColor: '#5000CA',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  closeButton: {
    marginRight: 15,
  },
  selectedText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  selectedActions: {
    flexDirection: 'row',
  },
  selectedAction: {
    marginLeft: 20,
    padding: 5,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 16,
    color: '#9E9E9E',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: width * 0.85,
    alignItems: 'center',
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333333',
    alignSelf: 'flex-start',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    width: '100%',
    marginBottom: 20,
    fontSize: 16,
    backgroundColor: '#F5F5F5',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    width: '100%',
  },
  modalButton: {
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
  },
  createButton: {
    backgroundColor: '#6200EE',
  },
  cancelButtonText: {
    color: '#666666',
    fontWeight: '600',
    fontSize: 16,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  }
});