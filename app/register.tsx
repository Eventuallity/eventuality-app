
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Icon from '../components/Icon';
import { supabase } from '../supabase-client';

const Register = () => {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const rochesterEmailRegex = /^[A-Za-z0-9._%+-]+@(u\.rochester\.edu|ur\.rochester\.edu|rochester\.edu)$/;

  const onSubmit = async () => {
    if (!name || !email || !password || !confirmPassword) {
      Alert.alert('Sign Up', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Sign Up', 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Sign Up', 'Password must be at least 6 characters');
      return;
    }

    if (!rochesterEmailRegex.test(email.trim())) {
      Alert.alert('Sign Up', 'Please use a valid University of Rochester email address');
      return;
    }
    try {
      setLoading(true);

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password.trim(),
        options: {
          data: {
            name: name.trim(),
          },
          // If you have email confirmations enabled:
          // emailRedirectTo: 'yourapp://auth-callback'
        },
      });

      setLoading(false);

      if (error) {
        Alert.alert('Sign Up', error.message);
        return;
      }

      // If you require email verification, you might want a different message:
      // e.g. "Check your email for a confirmation link"
      Alert.alert('Success', 'Account created successfully! Check your email for a confirmation link.', [
        { text: 'OK', onPress: () => router.replace('/(tabs)') },
      ]);
    } catch (err: any) {
      setLoading(false);
      Alert.alert('Sign Up', err?.message ?? 'Something went wrong');
    }
  };
// ...existing code...

  return (
    <ScrollView 
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.container}>
        {/* Back Button */}
        <Pressable 
          onPress={() => router.back()} 
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.backButtonPressed
          ]}
        >
          <Icon name="x" className="w-6 h-6" color="#a8a29e" />
        </Pressable>

        {/* Header with Logo */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoEvent}>Event</Text>
            <Text style={styles.logoUality}>uality</Text>
          </View>
        </View>

        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeText}>Hello,</Text>
          <Text style={styles.welcomeText}>Let's Get Started!</Text>
          <Text style={styles.subtitle}>Create an account to continue</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.inputWrapper}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your name"
              placeholderTextColor="#78716c"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
          </View>

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
              placeholder="Create a password"
              placeholderTextColor="#78716c"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
            />
            <Text style={styles.hint}>Must be at least 6 characters</Text>
          </View>

          <View style={styles.inputWrapper}>
            <Text style={styles.label}>Confirm Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Re-enter your password"
              placeholderTextColor="#78716c"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          <Pressable 
            onPress={onSubmit} 
            disabled={loading}
            style={({ pressed }) => [
              styles.signUpButton,
              pressed && styles.signUpButtonPressed,
              loading && styles.signUpButtonDisabled
            ]}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.signUpButtonText}>Sign Up</Text>
            )}
          </Pressable>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Pressable onPress={() => router.push('/login')}>
            <Text style={styles.loginText}>Login</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: '#1c1917', // stone-950
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#292524', // stone-800
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButtonPressed: {
    backgroundColor: '#44403c', // stone-700
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
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
    marginBottom: 32,
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
    gap: 20,
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
  hint: {
    fontSize: 12,
    color: '#78716c', // stone-500
    marginTop: 4,
  },
  signUpButton: {
    height: 48,
    backgroundColor: '#9333ea', // purple-600
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  signUpButtonPressed: {
    backgroundColor: '#7e22ce', // purple-700
  },
  signUpButtonDisabled: {
    opacity: 0.6,
  },
  signUpButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  footerText: {
    fontSize: 15,
    color: '#a8a29e', // stone-400
  },
  loginText: {
    fontSize: 15,
    color: '#a855f7', // purple-500
    fontWeight: '600',
  },
});

export default Register;