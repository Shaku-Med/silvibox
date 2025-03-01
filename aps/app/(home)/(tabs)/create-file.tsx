import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  Alert, 
  KeyboardAvoidingView, 
  Platform 
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import { MaterialIcons } from '@expo/vector-icons';
import Objects from '@/app/(auth)/Function/Client';

export default function SecurityCodeScreen() {
  // storedCode holds the encrypted string from SecureStore.
  const [storedCode, setStoredCode] = useState<string | null>(null);
  // phase controls which part of the flow is shown.
  // "loading" | "set" | "start" | "verify" | "edit"
  const [phase, setPhase] = useState<'loading' | 'set' | 'start' | 'verify' | 'edit'>('loading');
  // codeInput is used to hold input from the user.
  const [codeInput, setCodeInput] = useState('');
  // state for local auth loading indicator
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // On mount, check if a security code has been stored.
  useEffect(() => {
    const loadStoredCode = async () => {
      try {
        const code = await SecureStore.getItemAsync('ac');
        // We no longer attempt decryption here since we don't have the user’s input.
        setStoredCode(code);
        // If a code exists, we force the auth flow; otherwise, let the user set a new code.
        setPhase(code ? 'start' : 'set');
      } catch (error) {
        console.error('Error loading stored code:', error);
        setPhase('set');
      }
    };
    loadStoredCode();
  }, []);

  // Save a new security code.
  // We encrypt a known value (here, Platform.OS) so that later decryption can verify the input.
  const saveNewCode = async (newCode: string) => {
    if (newCode.trim().length === 0) {
      Alert.alert('Error', 'Please enter a valid security code.');
      return;
    }
    try {
      // Encrypt a known value (e.g., Platform.OS) using the new code as the password.
      const encrypted = Objects.encDec(Platform.OS, newCode);
      await SecureStore.setItemAsync('ac', encrypted);
      setStoredCode(encrypted);
      Alert.alert('Success', storedCode ? 'Security code updated!' : 'Security code saved!');
      setCodeInput('');
      // After setting/updating the code, require authentication next time.
      setPhase('start');
    } catch (error) {
      console.error('Error saving new code:', error);
      Alert.alert('Error', 'Could not save the security code.');
    }
  };

  // Run local authentication.
  const runLocalAuth = async () => {
    setIsAuthenticating(true);
    const result = await LocalAuthentication.authenticateAsync();
    setIsAuthenticating(false);
    if (result.success) {
      // After successful local auth, prompt the user to enter their current code.
      setCodeInput('');
      setPhase('verify');
    } else {
      Alert.alert('Authentication Failed', 'Please try again.');
    }
  };

  // Verify that the entered code decrypts the stored value correctly.
  const verifyCode = async () => {
    if (!storedCode) {
      Alert.alert('Error', 'No security code stored.');
      return;
    }
    try {
      // Attempt to decrypt the stored encrypted value with the entered code.
      const decrypted = Objects.encDec(storedCode, codeInput, true);
      console.log(decrypted)
      // Since we encrypted Platform.OS, a correct decryption should match it.
      if (decrypted === Platform.OS) {
        setCodeInput('');
        setPhase('edit');
      } else {
        Alert.alert('Error', 'The entered code does not match.');
      }
    } catch (error) {
      console.error('Decryption error:', error);
      Alert.alert('Error', 'Verification failed.');
    }
  };

  // Render UI based on the current phase.
  const renderContent = () => {
    switch (phase) {
      case 'set': // No stored code: allow user to create one.
        return (
          <>
            <TextInput
              style={styles.input}
              placeholder="Enter new security code"
              secureTextEntry
              value={codeInput}
              onChangeText={setCodeInput}
            />
            <TouchableOpacity style={styles.button} onPress={() => saveNewCode(codeInput)}>
              <Text style={styles.buttonText}>Save Code</Text>
            </TouchableOpacity>
          </>
        );

      case 'start': // Security code exists: prompt user to authenticate.
        return (
          <TouchableOpacity 
            style={styles.authButton} 
            onPress={runLocalAuth} 
            disabled={isAuthenticating}
          >
            <MaterialIcons 
              name={isAuthenticating ? 'hourglass-empty' : 'fingerprint'} 
              size={28} 
              color="white" 
            />
            <Text style={styles.authButtonText}>Authenticate</Text>
          </TouchableOpacity>
        );

      case 'verify': // After local auth: ask user to enter their current code.
        return (
          <>
            <Text style={styles.instructionText}>Enter your current security code</Text>
            <TextInput
              style={styles.input}
              placeholder="Current security code"
              secureTextEntry
              value={codeInput}
              onChangeText={setCodeInput}
            />
            <TouchableOpacity style={styles.button} onPress={verifyCode}>
              <Text style={styles.buttonText}>Verify Code</Text>
            </TouchableOpacity>
          </>
        );

      case 'edit': // After verification: allow user to enter a new security code.
        return (
          <>
            <Text style={styles.instructionText}>Enter your new security code</Text>
            <TextInput
              style={styles.input}
              placeholder="New security code"
              secureTextEntry
              value={codeInput}
              onChangeText={setCodeInput}
            />
            <TouchableOpacity style={styles.button} onPress={() => saveNewCode(codeInput)}>
              <Text style={styles.buttonText}>Save New Code</Text>
            </TouchableOpacity>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <Text style={styles.title}>
          {storedCode ? 'Edit Security Code' : 'Set Security Code'}
        </Text>
      </View>
      <View style={styles.content}>
        {phase === 'loading' ? <Text>Loading...</Text> : renderContent()}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F6F6',
    padding: 20,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#6200EE',
  },
  content: {
    alignItems: 'center',
    width: '100%',
  },
  instructionText: {
    fontSize: 16,
    color: '#444',
    marginBottom: 10,
  },
  input: {
    width: '100%',
    height: 50,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: 'white',
    fontSize: 18,
    paddingHorizontal: 15,
    marginBottom: 20,
  },
  button: {
    width: '100%',
    backgroundColor: '#6200EE',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  authButton: {
    flexDirection: 'row',
    backgroundColor: '#6200EE',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  authButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    marginLeft: 10,
  },
});
