// app/auth/register.js
import React, { useState } from "react";
import { View, TextInput, Button, StyleSheet, Alert } from "react-native";
import { useSQLiteContext } from "expo-sqlite";

export default function Register({ navigation }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const db = useSQLiteContext();

  const handleRegister = async () => {
    try {
      await db.runAsync(
        `INSERT INTO users (username, password) VALUES (?, ?)`,
        [username, password],
      );

      console.log();

      Alert.alert("Success", "User registered!");
      navigation.goBack();
    } catch (ex) {
      Alert.alert("Error", "Username might already exist.");
      console.log(error);
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        placeholder="Username"
        value={username}
        onChangeText={setUsername}
        style={styles.input}
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
      />
      <Button title="Register" onPress={handleRegister} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 20 },
  input: { borderWidth: 1, marginVertical: 10, padding: 10, borderRadius: 5 },
});
