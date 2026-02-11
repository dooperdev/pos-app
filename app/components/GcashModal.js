import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";

export default function GCashModal({ visible, total, onClose, onConfirm }) {
  const [received, setReceived] = useState("");
  const [reference, setReference] = useState("");

  useEffect(() => {
    if (!visible) {
      setReceived("");
      setReference("");
    }
  }, [visible]);
  const receivedAmount = parseFloat(received) || 0;
  const valid = receivedAmount >= total && reference.length >= 6;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>GCash Payment</Text>

          <Text style={styles.label}>Total Amount: ₱{total.toFixed(2)}</Text>

          <TextInput
            placeholder="Amount Received"
            keyboardType="numeric"
            value={received}
            onChangeText={setReceived}
            style={styles.input}
          />

          <TextInput
            placeholder="Reference Number"
            value={reference}
            onChangeText={setReference}
            style={styles.input}
          />

          <TouchableOpacity
            style={[styles.confirmBtn, !valid && { backgroundColor: "#ccc" }]}
            disabled={!valid}
            onPress={() => onConfirm(receivedAmount, reference)}
          >
            <Text style={styles.confirmText}>Confirm Payment</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
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
    width: "45%",
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  label: {
    fontSize: 16,
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 12,
    padding: 14,
    fontSize: 18,
    marginBottom: 14,
  },
  confirmBtn: {
    backgroundColor: "#1565C0",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 10,
  },
  confirmText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  cancelText: {
    textAlign: "center",
    fontSize: 16,
    color: "#555",
  },
});
