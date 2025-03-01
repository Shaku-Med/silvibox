// File: app/new-folder.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as FileSystem from 'expo-file-system';

export default function NewFolderScreen() {
  const { currentPath } = useLocalSearchParams();
  const [folderName, setFolderName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const createFolder = async () => {
    if (!folderName.trim()) {
      Alert.alert('Error', 'Folder name cannot be empty');
      return;
    }

    // Check for invalid characters
    if (/[\/\\:*?"<>|]/.test(folderName)) {
      Alert.alert('Error', 'Folder name contains invalid characters');
      return;
    }

    setIsCreating(true);
    try {
      const newFolderPath = `${currentPath}/${folderName}`;
      
      // Check if folder already exists
      const folderInfo = await FileSystem.getInfoAsync(newFolderPath);
      if (folderInfo.exists) {
        Alert.alert('Error', 'A folder with this name already exists');
        setIsCreating(false);
        return;
      }
      
      await FileSystem.makeDirectoryAsync(newFolderPath);
      router.back();
    } catch (error: any) {
      Alert.alert('Error', `Failed to create folder: ${error.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create New Folder</Text>
      <TextInput
        style={styles.input}
        value={folderName}
        onChangeText={setFolderName}
        placeholder="Folder name"
        autoFocus
      />
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.cancelButton]}
          onPress={() => router.back()}
        >
          <Text style={styles.buttonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.createButton, !folderName.trim() && styles.disabledButton]}
          onPress={createFolder}
          disabled={!folderName.trim() || isCreating}
        >
          <Text style={styles.buttonText}>{isCreating ? 'Creating...' : 'Create'}</Text>
        </TouchableOpacity>
      </View>
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
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#E0E0E0',
    marginRight: 8,
  },
  createButton: {
    backgroundColor: '#6200EE',
    marginLeft: 8,
  },
  disabledButton: {
    backgroundColor: '#B39DDB',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
