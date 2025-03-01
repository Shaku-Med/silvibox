import { useState } from 'react';
import { View, Text, Button, TextInput, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { useRouter } from 'expo-router';
import { MenuView } from '@react-native-menu/menu';

interface FileItem {
  name: string;
  uri: string;
}

export default function Home() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [newFolderName, setNewFolderName] = useState<string>('');
  const router = useRouter();

  const handleFileUpload = async () => {
    const result = await DocumentPicker.getDocumentAsync({});
    if (result.type === 'success') {
      const newPath = `${FileSystem.documentDirectory}${result.name}`;
      await FileSystem.copyAsync({ from: result.uri, to: newPath });
      setFiles([...files, { name: result.name, uri: newPath }]);
    }
  };

  const handleCreateFolder = () => {
    if (newFolderName) {
      setFolders([...folders, newFolderName]);
      setNewFolderName('');
    }
  };

  const handleDeleteFile = async (uri: string) => {
    await FileSystem.deleteAsync(uri);
    setFiles(files.filter((file) => file.uri !== uri));
  };

  return (
    <View style={styles.container}>
      <MenuView
        title="Actions"
        actions={[{ id: 'upload', title: 'Upload File' }, { id: 'create', title: 'Create Folder' }]}
        onPressAction={({ nativeEvent }) => {
          if (nativeEvent.event === 'upload') handleFileUpload();
          if (nativeEvent.event === 'create') handleCreateFolder();
        }}
      >
        <Button title="Open Menu" />
      </MenuView>

      <TextInput
        placeholder="New Folder Name"
        value={newFolderName}
        onChangeText={setNewFolderName}
        style={styles.input}
      />

      <Text style={styles.heading}>Folders:</Text>
      {folders.map((folder, index) => (
        <TouchableOpacity key={index} onPress={() => router.push(`./folder/${folder}`)}>
          <Text style={styles.folder}>{folder}</Text>
        </TouchableOpacity>
      ))}

      <Text style={styles.heading}>Files:</Text>
      <FlatList
        data={files}
        keyExtractor={(item) => item.uri}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => router.push(`./file/${encodeURIComponent(item.uri)}`)}>
            <View style={styles.fileContainer}>
              <Text style={styles.fileName}>{item.name}</Text>
              <TouchableOpacity onPress={() => handleDeleteFile(item.uri)}>
                <Text style={styles.delete}>Delete</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f8f8f8' },
  input: { borderBottomWidth: 1, marginVertical: 10, padding: 5 },
  heading: { marginTop: 20, fontWeight: 'bold', fontSize: 18 },
  folder: { padding: 10, backgroundColor: '#ddd', borderRadius: 10, marginVertical: 5 },
  fileContainer: { flexDirection: 'row', justifyContent: 'space-between', padding: 10 },
  fileName: { fontSize: 16 },
  delete: { color: 'red' },
});
