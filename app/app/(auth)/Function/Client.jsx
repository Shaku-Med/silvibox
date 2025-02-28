import CryptoJS from 'react-native-crypto-js';

const generateSalt = (password) => {
  return CryptoJS.SHA512(password).toString(CryptoJS.enc.Base64).substring(0, 16);
};

const generateKeyFromPassword = (password, salt) => {
  return CryptoJS.PBKDF2(password, salt, { keySize: 256 / 32, iterations: 1000000 }).toString(CryptoJS.enc.Base64);
};

const encryptMessage = (message, password) => {
  const salt = generateSalt(password);
  const key = generateKeyFromPassword(password, salt);
  const messageWordArray = CryptoJS.enc.Utf8.parse(message);
  return CryptoJS.AES.encrypt(messageWordArray, key, { iv: salt, mode: CryptoJS.mode.GCM }).toString();
};

const decryptMessage = (encryptedMessage, password) => {
  const salt = generateSalt(password);
  const key = generateKeyFromPassword(password, salt);
  const bytes = CryptoJS.AES.decrypt(encryptedMessage, key, { iv: salt, mode: CryptoJS.mode.GCM });
  return bytes.toString(CryptoJS.enc.Utf8);
};

export { encryptMessage, decryptMessage };
