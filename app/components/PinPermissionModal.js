import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { useSQLiteContext } from "expo-sqlite";
import { useAuth } from "../context/AuthContext";
import { logActivity } from "../utils/activityLogger"; // your logger

const OWNER_PIN = "111111"; // Owner PIN remains hardcoded

export default function PinPermissionModal({
  visible,
  onCancel,
  onSuccess,
  title = "Enter PIN",
  actionName = "PIN Approval", // specify action type
}) {
  const db = useSQLiteContext(); // SQLite instance
  const { user } = useAuth();
  const [pin, setPin] = useState("");

  const verifyPin = async () => {
    try {
      // Owner PIN check
      if (pin === OWNER_PIN) {
        await logActivity(
          db,
          user,
          actionName,
          `Owner PIN approved at ${new Date().toLocaleString()}`,
        );

        setPin("");
        onSuccess();
        return;
      }

      // Check Users table for PIN (ASYNC, NO TRANSACTION)
      const query = `SELECT * FROM Users WHERE PIN = ? LIMIT 1`;
      const rows = await db.getAllAsync(query, [pin]);

      if (rows.length > 0) {
        // User PIN matched
        const matchedUser = rows[0];

        await logActivity(
          db,
          user,
          actionName,
          `PIN approved by ${matchedUser.Name} at ${new Date().toLocaleString()}`,
        );

        setPin("");
        onSuccess();
      } else {
        // PIN failed
        await logActivity(
          db,
          user,
          "PIN Failed",
          `Invalid PIN attempt at ${new Date().toLocaleString()}`,
        );

        Alert.alert("Invalid PIN", "Permission denied");
        setPin("");
      }
    } catch (err) {
      console.error("SQLite error:", err);
      Alert.alert("Error", "Unexpected error verifying PIN");
      setPin("");
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>{title}</Text>

          <TextInput
            value={pin}
            onChangeText={setPin}
            keyboardType="numeric"
            secureTextEntry
            maxLength={6}
            style={styles.input}
            placeholder="••••••"
            textAlign="center"
          />

          <TouchableOpacity style={styles.confirmBtn} onPress={verifyPin}>
            <Text style={{ color: "#fff" }}>Confirm</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onCancel}>
            <Text style={styles.cancel}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modal: {
    width: "80%",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 14,
    fontSize: 20,
    letterSpacing: 10,
    marginBottom: 15,
  },
  confirmBtn: {
    backgroundColor: "#2979FF",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  cancel: {
    textAlign: "center",
    marginTop: 12,
    color: "#777",
  },
});
