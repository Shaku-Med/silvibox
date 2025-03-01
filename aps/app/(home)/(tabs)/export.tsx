import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import { Ionicons } from '@expo/vector-icons';

export default function ExportScreen() {
  const { uri, name } = useLocalSearchParams();
  const [fileName, setFileName] = useState(name || 'export.txt');
  const [isExporting, setIsExporting] = useState(false);

  const saveToDevice = async () => {
    if (!fileName.trim()) {
      Alert.alert('Error', 'File name cannot be empty');
      return;
    }

    setIsExporting(true);
    try {
      // Request permissions
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Cannot save file without permissions');
        setIsExporting(false);
        return;
      }
      
      // Create temporary file if needed
      let fileUri = uri;
      if (!uri) {
        // Create a new empty file
        fileUri = `${FileSystem.cacheDirectory}${fileName}`;
        await FileSystem.writeAsStringAsync(fileUri, '');
      }
      
      // Save file to media library
      const asset = await MediaLibrary.createAssetAsync(fileUri);
      await MediaLibrary.createAlbumAsync('ExpoFileManager', asset, false);
      
      Alert.alert('Success', `Saved ${fileName} to your device`);
      router.back();
    } catch (error) {
      Alert.alert('Error', `Failed to save to device: ${error.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const shareFile = async () => {
    if (!fileName.trim()) {
      Alert.alert('Error', 'File name cannot be empty');
      return;
    }

    setIsExporting(true);
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Error', 'Sharing is not available on this device');
        setIsExporting(false);
        return;
      }
      
      // Create temporary file if needed
      let fileUri = uri;
      if (!uri) {
        // Create a new empty file
        fileUri = `${FileSystem.cacheDirectory}${fileName}`;
        await FileSystem.writeAsStringAsync(fileUri, '');
      }
      
      await Sharing.shareAsync(fileUri);
      router.back();
    } catch (error) {
      Alert.alert('Error', `Failed to share: ${error.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Export File</Text>
      
      <TextInput
        style={styles.input}
        value={fileName}
        onChangeText={setFileName}
        placeholder="File name"
        autoFocus
        selectTextOnFocus
      />
      
      {isExporting ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6200EE" />
          <Text style={styles.loadingText}>Processing...</Text>
        </View>
      ) : (
        <View style={styles.optionsContainer}>
          <TouchableOpacity style={styles.option} onPress={saveToDevice}>
            <View style={styles.iconContainer}>
              <Ionicons name="download" size={48} color="#6200EE" />
            </View>
            <Text style={styles.optionText}>Save to Device</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.option} onPress={shareFile}>
            <View style={styles.iconContainer}>
              <Ionicons name="share" size={48} color="#6200EE" />
            </View>
            <Text style={styles.optionText}>Share</Text>
          </TouchableOpacity>
        </View>
      )}
      
      <TouchableOpacity
        style={styles.cancelButton}
        onPress={() => router.back()}
        disabled={isExporting}
      >
        <Text style={styles.cancelButtonText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: 'white',
    marginTop: 20
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    color: '#6200EE',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 24,
  },
  optionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 32,
  },
  option: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E8E0FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  optionText: {
    fontSize: 16,
    color: '#6200EE',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6200EE',
  },
  cancelButton: {
    marginTop: 'auto',
    padding: 16,
    backgroundColor: '#E0E0E0',
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#424242',
  },
});