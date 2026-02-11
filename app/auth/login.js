// app/auth/login.js
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSQLiteContext } from "expo-sqlite";
import { useAuth } from "../context/AuthContext";

export default function Login({ navigation }) {
  const db = useSQLiteContext();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // 🔑 DEFAULT OWNER ACCOUNT (NO DB)
  const OWNER_EMAIL = "admin";
  const OWNER_PASSWORD = "123qwe";

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Missing Fields", "Please enter email and password");
      return;
    }

    setLoading(true);

    try {
      /* =========================
         OWNER LOGIN
      ========================== */
      if (
        email.trim().toLowerCase() === OWNER_EMAIL &&
        password === OWNER_PASSWORD
      ) {
        login({
          UserID: 0,
          Name: "Owner",
          Role: "OWNER",
          Email: OWNER_EMAIL,
        });

        // ✅ Navigate to Home
        navigation.reset({
          index: 0,
          routes: [{ name: "Home" }],
        });

        return;
      }

      /* =========================
         NORMAL USER LOGIN (DB)
      ========================== */
      const user = await db.getFirstAsync(
        `SELECT UserID, Name, Role, Email, Password
         FROM Users
         WHERE Email = ?`,
        [email.trim()],
      );

      if (!user) {
        Alert.alert("Login Failed", "User not found");
        return;
      }

      // ⚠️ Dev-only password check
      if (user.Password !== password) {
        Alert.alert("Login Failed", "Invalid password");
        return;
      }

      // ✅ Save user to AuthContext
      login({
        UserID: user.UserID,
        Name: user.Name,
        Role: user.Role,
        Email: user.Email,
      });

      // ✅ Navigate to Home
      navigation.reset({
        index: 0,
        routes: [{ name: "Home" }],
      });
    } catch (error) {
      console.error("Login error:", error);
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Login</Text>

        <TextInput
          placeholder="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
          value={email}
          onChangeText={setEmail}
        />

        <TextInput
          placeholder="Password"
          secureTextEntry
          style={styles.input}
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity
          style={[styles.button, loading && { opacity: 0.6 }]}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? "Logging in..." : "Continue"}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#EAF2F8",
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    width: "50%",
    padding: 30,
    backgroundColor: "#fff",
    borderRadius: 16,
    elevation: 5,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 14,
    marginBottom: 15,
  },
  button: {
    backgroundColor: "#2979FF",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});
