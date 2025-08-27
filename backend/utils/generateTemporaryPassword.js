import crypto from 'crypto';

export const generateTemporaryPassword = () => {
  // Define character sets for high security
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  
  // Ensure at least one character from each set
  let password = '';
  password += lowercase[crypto.randomInt(0, lowercase.length)]; // 1 lowercase
  password += uppercase[crypto.randomInt(0, uppercase.length)]; // 1 uppercase
  password += numbers[crypto.randomInt(0, numbers.length)];     // 1 number
  password += symbols[crypto.randomInt(0, symbols.length)];     // 1 symbol
  
  // Fill remaining 8 characters randomly from all sets
  const allChars = lowercase + uppercase + numbers + symbols;
  for (let i = 0; i < 8; i++) {
    password += allChars[crypto.randomInt(0, allChars.length)];
  }
  
  // Shuffle the password to make it more random
  return password.split('').sort(() => Math.random() - 0.5).join('');
};

// Alternative: Generate a more complex password (16 characters)
export const generateComplexTemporaryPassword = () => {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  
  let password = '';
  
  // Ensure at least 2 characters from each set for better distribution
  password += lowercase[crypto.randomInt(0, lowercase.length)];
  password += lowercase[crypto.randomInt(0, lowercase.length)];
  password += uppercase[crypto.randomInt(0, uppercase.length)];
  password += uppercase[crypto.randomInt(0, uppercase.length)];
  password += numbers[crypto.randomInt(0, numbers.length)];
  password += numbers[crypto.randomInt(0, numbers.length)];
  password += symbols[crypto.randomInt(0, symbols.length)];
  password += symbols[crypto.randomInt(0, symbols.length)];
  
  // Fill remaining 8 characters randomly
  const allChars = lowercase + uppercase + numbers + symbols;
  for (let i = 0; i < 8; i++) {
    password += allChars[crypto.randomInt(0, allChars.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
};
