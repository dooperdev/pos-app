import React from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";

export default function SidebarButton({ label, primary, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.btn, primary && styles.primary]}
      onPress={onPress}
    >
      <Text style={[styles.text, primary && styles.primaryText]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#F2F2F2",
    marginBottom: 12,
  },
  text: {
    fontSize: 16,
  },
  primary: {
    backgroundColor: "#F63049",
  },
  primaryText: {
    color: "#fff",
    fontWeight: "bold",
  },
});
