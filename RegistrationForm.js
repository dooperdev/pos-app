import { useState } from "react";
import { View, Text, TextInput, Button, StyleSheet, Alert } from "react-native";
import { useSQLiteContext } from "expo-sqlite";

const RegistrationForm = () => {
  const [form, setForm] = useState({ username: "", password: "" });
  const db = useSQLiteContext();

  const handleSubmit = async () => {
    try {
      if (!form.username || !form.password) {
        throw new Error("All fields required.");
      }

      await db.runAsync(
        `INSERT INTO users (username, password) VALUES (?, ?)`,
        [form.username, form.password],
      );

      Alert.alert("Success", "Successfully Added.");
      setForm({ username: "", password: "" });
    } catch (ex) {
      console.log(ex);
      Alert.alert("Error", ex.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>POS Login</Text>
      <TextInput
        placeholder="Username"
        style={styles.input}
        value={form.username}
        onChangeText={(text) => setForm({ ...form, username: text })}
      />
      <TextInput
        placeholder="Password"
        secureTextEntry
        style={styles.input}
        value={form.password}
        onChangeText={(text) => setForm({ ...form, password: text })}
      />
      <Button title="Register" onPress={handleSubmit} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 20 },
  title: { fontSize: 26, textAlign: "center", marginBottom: 20 },
  input: { borderWidth: 1, padding: 12, marginBottom: 10, borderRadius: 6 },
});

export default RegistrationForm;
