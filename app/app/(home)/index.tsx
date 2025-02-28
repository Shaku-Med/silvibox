import React, { useState, useEffect } from 'react';
import { View, Button, Text, TextInput, Alert } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import DocumentPicker from 'react-native-document-picker';

export default function App() {
  const [folderName, setFolderName] = useState('');
  const [fileContent, setFileContent] = useState('');
  const [permissionGranted, setPermissionGranted] = useState(false);

  // Request Permission for Media Library Access (for file selection)
  const requestPermissions = async () => {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status === 'granted') {
      setPermissionGranted(true);
    } else {
      Alert.alert('Permission Denied', 'You need to grant permission to access files.');
    }
  };

  useEffect(() => {
    requestPermissions();
  }, []);

  // Create Folder
  const createFolder = async () => {
    if (!permissionGranted) {
      Alert.alert('Permission Denied', 'You need to grant permission to access files.');
      return;
    }

    try {
      const directoryUri = FileSystem.documentDirectory + folderName;
      await FileSystem.makeDirectoryAsync(directoryUri, { intermediates: true });
      Alert.alert('Folder Created', `Folder ${folderName} created successfully.`);
    } catch (error) {
      Alert.alert('Error', 'Failed to create folder.');
    }
  };

  // Upload File
  const uploadFile = async () => {
    if (!permissionGranted) {
      Alert.alert('Permission Denied', 'You need to grant permission to access files.');
      return;
    }

    try {
      const fileUri = FileSystem.documentDirectory + folderName + '/uploadedFile.txt';
      await FileSystem.writeAsStringAsync(fileUri, fileContent);
      Alert.alert('File Uploaded', 'File uploaded successfully.');
    } catch (error) {
      Alert.alert('Error', 'Failed to upload file.');
    }
  };

  // Delete File
  const deleteFile = async () => {
    if (!permissionGranted) {
      Alert.alert('Permission Denied', 'You need to grant permission to access files.');
      return;
    }

    try {
      const fileUri = FileSystem.documentDirectory + folderName + '/uploadedFile.txt';
      await FileSystem.deleteAsync(fileUri);
      Alert.alert('File Deleted', 'File deleted successfully.');
    } catch (error) {
      Alert.alert('Error', 'Failed to delete file.');
    }
  };

  // Select File
  const selectFile = async () => {
    if (!permissionGranted) {
      Alert.alert('Permission Denied', 'You need to grant permission to access files.');
      return;
    }

    try {
      const res: any = await DocumentPicker.pick({
        type: [DocumentPicker.types.allFiles],
      });
      Alert.alert('File Selected', res.uri);
    } catch (error) {
      if (DocumentPicker.isCancel(error)) {
        Alert.alert('Error', 'User canceled the picker.');
      } else {
        Alert.alert('Error', 'Failed to pick file.');
      }
    }
  };

  // Rename Folder (Workaround)
  const renameFolder = async () => {
    if (!permissionGranted) {
      Alert.alert('Permission Denied', 'You need to grant permission to access files.');
      return;
    }

    try {
      const oldFolderUri = FileSystem.documentDirectory + folderName;
      const newFolderUri = FileSystem.documentDirectory + folderName + '_new';
      
      // Copy files from old folder to new folder
      await FileSystem.copyAsync({ from: oldFolderUri, to: newFolderUri });
      await FileSystem.deleteAsync(oldFolderUri); // Remove old folder
      Alert.alert('Folder Renamed', 'Folder renamed successfully.');
    } catch (error) {
      Alert.alert('Error', 'Failed to rename folder.');
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Native File System App</Text>

      {/* Folder Name */}
      <TextInput
        placeholder="Enter folder name"
        value={folderName}
        onChangeText={setFolderName}
        style={{ width: 200, padding: 8, borderWidth: 1, marginBottom: 10 }}
      />

      {/* Create Folder */}
      <Button title="Create Folder" onPress={createFolder} />

      {/* File Content */}
      <TextInput
        placeholder="Enter file content"
        value={fileContent}
        onChangeText={setFileContent}
        style={{ width: 200, padding: 8, borderWidth: 1, marginVertical: 10 }}
      />

      {/* Upload File */}
      <Button title="Upload File" onPress={uploadFile} />

      {/* Delete File */}
      <Button title="Delete File" onPress={deleteFile} />

      {/* Select File */}
      <Button title="Select File" onPress={selectFile} />

      {/* Rename Folder */}
      <Button title="Rename Folder" onPress={renameFolder} />
    </View>
  );
}
