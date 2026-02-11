import React from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native";

export default function TenderModal({
  visible,
  onClose,
  onCash,
  onGCash,
  onSplit,
}) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>Select Payment Method</Text>

          <TouchableOpacity style={styles.methodBtn} onPress={onCash}>
            <Text style={styles.methodText}>💵 CASH</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.methodBtn} onPress={onGCash}>
            <Text style={styles.methodText}>📱 GCASH</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.methodBtn} onPress={onSplit}>
            <Text style={styles.methodText}>💳 SPLIT (CASH + GCASH)</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
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
  methodBtn: {
    backgroundColor: "#2979FF",
    paddingVertical: 18,
    borderRadius: 14,
    marginBottom: 14,
    alignItems: "center",
  },
  methodText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  cancelBtn: {
    marginTop: 10,
    alignItems: "center",
  },
  cancelText: {
    color: "#555",
    fontSize: 16,
  },
});
