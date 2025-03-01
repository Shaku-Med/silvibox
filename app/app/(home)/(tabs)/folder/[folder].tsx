import { useLocalSearchParams } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';

export default function FolderView() {
  const { folder } = useLocalSearchParams();
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Folder: {folder}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f8f8' },
  title: { fontSize: 22, fontWeight: 'bold' },
});
