import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { supabase } from '../supabase-client';

const Login = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    if (!email || !password) {
      Alert.alert('Login', 'Please fill in all fields');
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      setLoading(false);

      if (error) {
        Alert.alert('Login', error.message);
        return;
      }

      // On success, go to main tabs
      router.replace('/(tabs)');
    } catch (err: any) {
      setLoading(false);
      Alert.alert('Login', err?.message ?? 'Something went wrong');
    }
  };
  
  return (
    <View style={styles.container}>
      {/* Header with Logo */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoEvent}>Event</Text>
          <Text style={styles.logoUality}>uality</Text>
        </View>
      </View>

      {/* Welcome Section */}
      <View style={styles.welcomeSection}>
        <Text style={styles.welcomeText}>Hi,</Text>
        <Text style={styles.welcomeText}>Welcome Back!</Text>
        <Text style={styles.subtitle}>Please login to your account</Text>
      </View>

      {/* Form */}
      <View style={styles.form}>
        <View style={styles.inputWrapper}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your email"
            placeholderTextColor="#78716c"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <View style={styles.inputWrapper}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your password"
            placeholderTextColor="#78716c"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
          />
        </View>

        <Pressable onPress={() => Alert.alert('Forgot Password', 'Password reset functionality')}>
          <Text style={styles.forgotPassword}>Forgot Password?</Text>
        </Pressable>

        <Pressable 
          onPress={onSubmit} 
          disabled={loading}
          style={({ pressed }) => [
            styles.loginButton,
            pressed && styles.loginButtonPressed,
            loading && styles.loginButtonDisabled
          ]}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.loginButtonText}>Login</Text>
          )}
        </Pressable>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Don't have an account? </Text>
        <Pressable onPress={() => router.push('/register')}>
          <Text style={styles.signUpText}>Sign Up</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1c1917', // stone-950
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoEvent: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#f5f5f4', // stone-100
    letterSpacing: -0.5,
  },
  logoUality: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#a855f7', // purple-500
    letterSpacing: -0.5,
  },
  welcomeSection: {
    marginBottom: 40,
  },
  welcomeText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#f5f5f4', // stone-100
    lineHeight: 42,
  },
  subtitle: {
    fontSize: 16,
    color: '#a8a29e', // stone-400
    marginTop: 8,
  },
  form: {
    gap: 24,
    marginBottom: 32,
  },
  inputWrapper: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#d6d3d1', // stone-300
  },
  input: {
    height: 48,
    backgroundColor: '#292524', // stone-800
    borderColor: '#44403c', // stone-700
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    color: '#e7e5e4', // stone-200
    fontSize: 16,
  },
  forgotPassword: {
    textAlign: 'right',
    fontSize: 14,
    fontWeight: '600',
    color: '#a855f7', // purple-500
  },
  loginButton: {
    height: 48,
    backgroundColor: '#9333ea', // purple-600
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  loginButtonPressed: {
    backgroundColor: '#7e22ce', // purple-700
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 15,
    color: '#a8a29e', // stone-400
  },
  signUpText: {
    fontSize: 15,
    color: '#a855f7', // purple-500
    fontWeight: '600',
  },
});

export default Login;