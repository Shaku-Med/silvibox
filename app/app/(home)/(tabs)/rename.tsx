// File: app/rename.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as FileSystem from 'expo-file-system';

export default function RenameScreen() {
  const { uri, name, currentPath }: any = useLocalSearchParams();
  const [newName, setNewName] = useState<any>(name);
  const [isRenaming, setIsRenaming] = useState<any>(false);

  const renameItem = async () => {
    if (!newName.trim()) {
      Alert.alert('Error', 'Name cannot be empty');
      return;
    }

    // Check for invalid characters
    if (/[\/\\:*?"<>|]/.test(newName)) {
      Alert.alert('Error', 'Name contains invalid characters');
      return;
    }

    if (newName === name) {
      router.back();
      return;
    }

    setIsRenaming(true);
    try {
      const newUri = `${currentPath}/${newName}`;
      
      // Check if item already exists
      const itemInfo = await FileSystem.getInfoAsync(newUri);
      if (itemInfo.exists) {
        Alert.alert('Error', 'An item with this name already exists');
        setIsRenaming(false);
        return;
      }
      
      await FileSystem.moveAsync({
        from: uri,
        to: newUri
      });
      router.back();
    } catch (error: any) {
      Alert.alert('Error', `Failed to rename: ${error.message}`);
    } finally {
      setIsRenaming(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Rename</Text>
      <TextInput
        style={styles.input}
        value={newName}
        onChangeText={setNewName}
        placeholder="New name"
        autoFocus
        selectTextOnFocus
      />
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.cancelButton]}
          onPress={() => router.back()}
        >
          <Text style={styles.buttonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.renameButton, !newName.trim() && styles.disabledButton]}
          onPress={renameItem}
          disabled={!newName.trim() || isRenaming}
        >
          <Text style={styles.buttonText}>{isRenaming ? 'Renaming...' : 'Rename'}</Text>
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
    marginTop: 15
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
  renameButton: {
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