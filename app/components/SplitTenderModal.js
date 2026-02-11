import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
} from "react-native";

export default function SplitTenderModal({
  visible,
  total,
  onClose,
  onConfirm,
}) {
  const [cash, setCash] = useState("");
  const [gcash, setGcash] = useState("");
  const [reference, setReference] = useState("");

  useEffect(() => {
    if (!visible) {
      setCash("");
      setGcash("");
      setReference("");
    }
  }, [visible]);
  const cashAmt = parseFloat(cash) || 0;
  const gcashAmt = parseFloat(gcash) || 0;
  const paid = cashAmt + gcashAmt;

  const valid = paid >= total && reference.length >= 6;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 10 }}
          >
            <Text style={styles.title}>Split Payment</Text>

            <Text style={styles.label}>Total Amount: ₱{total.toFixed(2)}</Text>

            <TextInput
              placeholder="Cash Amount"
              keyboardType="numeric"
              value={cash}
              onChangeText={setCash}
              style={styles.input}
            />

            <TextInput
              placeholder="GCash Amount"
              keyboardType="numeric"
              value={gcash}
              onChangeText={setGcash}
              style={styles.input}
            />

            <TextInput
              placeholder="GCash Reference Number"
              value={reference}
              onChangeText={setReference}
              style={styles.input}
            />

            <Text style={styles.label}>Paid: ₱{paid.toFixed(2)}</Text>
            <Text style={styles.label}>
              Change: ₱{Math.max(paid - total, 0).toFixed(2)}
            </Text>

            <TouchableOpacity
              style={[styles.confirmBtn, !valid && { backgroundColor: "#ccc" }]}
              disabled={!valid}
              onPress={() =>
                onConfirm({
                  cash: cashAmt,
                  gcash: gcashAmt,
                  reference,
                })
              }
            >
              <Text style={styles.confirmText}>Confirm Payment</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
const { width, height } = Dimensions.get("window");
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modal: {
    width: width > 600 ? "45%" : "90%", // tablet vs phone
    maxHeight: height * 0.85,
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
    backgroundColor: "#2979FF",
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
