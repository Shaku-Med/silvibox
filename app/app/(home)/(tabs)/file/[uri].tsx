import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, Text, Button, TextInput, StyleSheet } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { useRouter } from 'expo-router';

export default function FileView() {
  const { uri } = useLocalSearchParams();
  const router = useRouter();
  const [content, setContent] = useState<string>('');
  const [editedContent, setEditedContent] = useState<string>('');

  useEffect(() => {
    const readFile = async () => {
      const fileContent = await FileSystem.readAsStringAsync(uri as string);
      setContent(fileContent);
      setEditedContent(fileContent);
    };
    readFile();
  }, [uri]);

  const handleSave = async () => {
    await FileSystem.writeAsStringAsync(uri as string, editedContent);
    router.back();
  };

  const handleDelete = async () => {
    await FileSystem.deleteAsync(uri as string);
    router.back();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Editing File:</Text>
      <TextInput
        value={editedContent}
        onChangeText={setEditedContent}
        multiline
        style={styles.textArea}
      />
      <Button title="Save Changes" onPress={handleSave} />
      <Button title="Delete File" onPress={handleDelete} color="red" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f8f8f8' },
  heading: { fontWeight: 'bold', fontSize: 18, marginBottom: 10 },
  textArea: { borderWidth: 1, marginVertical: 10, padding: 10, height: 300, textAlignVertical: 'top' },
});
