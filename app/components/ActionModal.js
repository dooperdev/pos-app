import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
} from "react-native";
import PinPermissionModal from "./PinPermissionModal"; // import your PIN modal

export default function ActionModal({
  visible,
  onClose,
  navigation,
  onProductChange,
}) {
  const screenHeight = Dimensions.get("window").height;

  const [pinVisible, setPinVisible] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState(null);

  // Handle PIN-protected navigation
  const handleProtectedNavigate = (screen) => {
    setPendingNavigation(screen);
    setPinVisible(true);
  };

  // After successful PIN
  const handlePinSuccess = () => {
    setPinVisible(false);
    if (pendingNavigation) {
      navigation.navigate(pendingNavigation, { onProductChange });
      setPendingNavigation(null);
      onClose();
    }
  };

  const handleNavigate = (screen, requiresPin = false) => {
    if (requiresPin) {
      handleProtectedNavigate(screen);
    } else {
      navigation.navigate(screen, { onProductChange });
      onClose();
    }
  };

  return (
    <>
      <Modal visible={visible} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={[styles.modal, { maxHeight: screenHeight * 0.8 }]}>
            <Text style={styles.title}>Settings</Text>

            <ScrollView contentContainerStyle={{ paddingBottom: 10 }}>
              {/* PIN-protected */}
              <TouchableOpacity
                style={styles.btn}
                onPress={() => handleNavigate("Users", true)}
              >
                <Text style={styles.btnText}>Users</Text>
              </TouchableOpacity>

              {/* Non-PIN screens */}
              <TouchableOpacity
                style={styles.btn}
                onPress={() => handleNavigate("Products")}
              >
                <Text style={styles.btnText}>Products</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.btn}
                onPress={() => handleNavigate("Inventory")}
              >
                <Text style={styles.btnText}>Inventory</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.btn}
                onPress={() => handleNavigate("Suppliers")}
              >
                <Text style={styles.btnText}>Suppliers</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.btn}
                onPress={() => handleNavigate("Categories")}
              >
                <Text style={styles.btnText}>Categories</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.btn}
                onPress={() => handleNavigate("ActivityLogs", true)}
              >
                <Text style={styles.btnText}>Activity Logs</Text>
              </TouchableOpacity>
            </ScrollView>

            <TouchableOpacity
              style={[styles.btn, { backgroundColor: "#ccc" }]}
              onPress={onClose}
            >
              <Text>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* PIN Modal */}
      <PinPermissionModal
        visible={pinVisible}
        onCancel={() => setPinVisible(false)}
        onSuccess={handlePinSuccess}
        title="Enter Admin PIN"
        action="Access Users Screen"
      />
    </>
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
    borderRadius: 12,
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
  },
  btn: {
    backgroundColor: "#2979FF",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    alignItems: "center",
  },
  btnText: {
    color: "#fff",
    fontSize: 16,
  },
});
