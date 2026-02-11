import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";

export default function DiscountModal({ visible, item, onApply, onClose }) {
  const [value, setValue] = useState("0");
  const [type, setType] = useState("₱");

  const applyDiscount = () => {
    onApply({
      ...item,
      discount: Number(value),
      discountType: type,
    });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>Discount – {item?.name}</Text>

          <TextInput
            keyboardType="numeric"
            value={value}
            onChangeText={setValue}
            style={styles.input}
          />

          <View style={styles.row}>
            <TouchableOpacity
              style={[styles.typeBtn, type === "₱" && styles.active]}
              onPress={() => setType("₱")}
            >
              <Text>₱</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.typeBtn, type === "%" && styles.active]}
              onPress={() => setType("%")}
            >
              <Text>%</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.applyBtn} onPress={applyDiscount}>
            <Text style={styles.applyText}>Apply</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose}>
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
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  modal: {
    width: "40%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 12,
    marginBottom: 15,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 20,
  },
  typeBtn: {
    padding: 14,
    borderWidth: 1,
    borderRadius: 10,
    width: 80,
    alignItems: "center",
  },
  active: {
    backgroundColor: "#2979FF",
  },
  applyBtn: {
    backgroundColor: "#2979FF",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  applyText: {
    color: "#fff",
    fontSize: 16,
  },
  cancel: {
    marginTop: 10,
    textAlign: "center",
    color: "#777",
  },
});
