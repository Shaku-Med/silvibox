import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

export default function UploadScreen() {
  const { currentPath } = useLocalSearchParams();
  const [isUploading, setIsUploading] = useState(false);

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: true
      });
      if (result.canceled) return;
      for (const file of result.assets) {
        await uploadFile(file.uri, file.name);
      }
    } catch (error) {
      Alert.alert('Error', `Failed to pick document: ${error.message}`);
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: false,
        quality: 1,
        allowsMultipleSelection: true
      });
      if (result.canceled) return;
      for (const asset of result.assets) {
        const filename = asset.uri.split('/').pop() || `image_${Date.now()}.jpg`;
        await uploadFile(asset.uri, filename);
      }
    } catch (error) {
      Alert.alert('Error', `Failed to pick image: ${error.message}`);
    }
  };

  const openCamera = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        quality: 1
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      const filename = asset.uri.split('/').pop() || `capture_${Date.now()}`;
      await uploadFile(asset.uri, filename);
    } catch (error) {
      Alert.alert('Error', `Failed to open camera: ${error.message}`);
    }
  };

  const uploadFile = async (uri: string, filename: string) => {
    setIsUploading(true);
    try {
      const destinationUri = `${currentPath}/${filename}`;
      const fileInfo = await FileSystem.getInfoAsync(destinationUri);
      if (fileInfo.exists) {
        Alert.alert('File Already Exists', 'A file with this name already exists.', [{ text: 'OK', onPress: () => setIsUploading(false) }]);
        return;
      }
      await FileSystem.copyAsync({ from: uri, to: destinationUri });
      router.back();
    } catch (error) {
      Alert.alert('Error', `Failed to upload file: ${error.message}`);
      setIsUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Upload File</Text>

      {isUploading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6200EE" />
          <Text style={styles.loadingText}>Uploading...</Text>
        </View>
      ) : (
        <View style={styles.optionsContainer}>
          <TouchableOpacity style={styles.option} onPress={pickDocument}>
            <Ionicons name="document" size={48} color="#6200EE" />
            <Text style={styles.optionText}>Document</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.option} onPress={pickImage}>
            <Ionicons name="image" size={48} color="#6200EE" />
            <Text style={styles.optionText}>Gallery</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.option} onPress={openCamera}>
            <Ionicons name="camera" size={48} color="#6200EE" />
            <Text style={styles.optionText}>Camera</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()} disabled={isUploading}>
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
    marginBottom: 32,
    color: '#6200EE',
  },
  optionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 32,
  },
  option: {
    alignItems: 'center',
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
  optionText: {
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
