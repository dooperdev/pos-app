// ====== CHANGES ======
// 1. Removed showPin logic
// 2. PIN textbox always visible
// 3. Validation requires PIN for all roles
// 4. Removed role-specific PIN handling

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { useSQLiteContext } from "expo-sqlite";
import PinPermissionModal from "../components/PinPermissionModal";
import { logActivity } from "../utils/activityLogger";

export default function UserPage({ currentUser }) {
  const db = useSQLiteContext();

  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const [pinVisible, setPinVisible] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  const [form, setForm] = useState({
    Name: "",
    Role: "",
    Email: "",
    Password: "",
    Pin: "",
  });

  // ====== LOAD USERS ======
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const result = await db.getAllAsync("SELECT * FROM Users");
      setUsers(result);
    } catch (err) {
      console.error("Failed to load users:", err);
    }
  };

  const resetForm = () => {
    setForm({
      Name: "",
      Role: "",
      Email: "",
      Password: "",
      Pin: "",
    });
  };

  const requestPermission = (type, payload = null) => {
    setPendingAction({ type, payload });
    setPinVisible(true);
  };

  const handlePinSuccess = () => {
    if (!pendingAction) return;

    const { type, payload } = pendingAction;

    setPinVisible(false);
    setPendingAction(null);

    switch (type) {
      case "ADD_USER":
        resetForm();
        setEditingUser(null);
        setModalVisible(true);
        break;

      case "EDIT_USER":
        setEditingUser(payload);
        setForm({
          Name: payload.Name,
          Role: payload.Role,
          Email: payload.Email,
          Password: payload.Password,
          Pin: payload.Pin || "",
        });
        setModalVisible(true);
        break;

      case "DELETE_USER":
        deleteUserFromDB(payload);
        break;

      default:
        break;
    }
  };

  const saveUser = async () => {
    // Validation
    if (
      !form.Name ||
      !form.Email ||
      !form.Password ||
      !form.Role ||
      !form.Pin
    ) {
      Alert.alert("Validation", "All fields including PIN are required.");
      return;
    }

    try {
      const emailToCheck = form.Email.trim().toLowerCase();

      const existing = await db.getAllAsync(
        "SELECT * FROM Users WHERE LOWER(Email) = ?",
        [emailToCheck],
      );

      if (
        existing.length > 0 &&
        (!editingUser || existing[0].UserID !== editingUser.UserID)
      ) {
        Alert.alert("Error", "Username already exists.");
        return;
      }

      if (editingUser) {
        await db.runAsync(
          `UPDATE Users SET Name=?, Role=?, Email=?, Password=?, Pin=? WHERE UserID=?`,
          [
            form.Name,
            form.Role,
            emailToCheck,
            form.Password,
            form.Pin,
            editingUser.UserID,
          ],
        );

        await logActivity(
          db,
          currentUser,
          "EDIT_USER",
          `Edited user ${editingUser.Name} (${editingUser.UserID})`,
        );
      } else {
        await db.runAsync(
          `INSERT INTO Users (Name, Role, Email, Password, Pin) VALUES (?, ?, ?, ?, ?)`,
          [form.Name, form.Role, emailToCheck, form.Password, form.Pin],
        );

        await logActivity(
          db,
          currentUser,
          "ADD_USER",
          `Added new user ${form.Name}`,
        );
      }

      setModalVisible(false);
      setEditingUser(null);
      resetForm();
      loadUsers();
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Something went wrong.");
    }
  };

  const deleteUserFromDB = async (user) => {
    try {
      await db.runAsync("DELETE FROM Users WHERE UserID=?", [user.UserID]);
      await logActivity(
        db,
        currentUser,
        "DELETE_USER",
        `Deleted user ${user.Name} (${user.UserID})`,
      );
      loadUsers();
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to delete user.");
    }
  };

  const filteredUsers = users.filter((u) =>
    u.Name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <View style={styles.container}>
      {/* SEARCH + ADD */}
      <View style={styles.topBar}>
        <TextInput
          placeholder="Search user..."
          value={search}
          onChangeText={setSearch}
          style={styles.search}
        />
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => requestPermission("ADD_USER")}
        >
          <Text style={{ color: "#fff" }}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* USER TABLE */}
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.headerCell, { flex: 2 }]}>Name</Text>
          <Text style={[styles.headerCell, { flex: 1 }]}>Role</Text>
          <Text style={[styles.headerCell, { flex: 2 }]}>Email</Text>
          <Text style={[styles.headerCell, { flex: 1.5 }]}>Action</Text>
        </View>

        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => item.UserID.toString()}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Text style={[styles.cell, { flex: 2 }]}>{item.Name}</Text>
              <Text style={[styles.cell, { flex: 1 }]}>{item.Role}</Text>
              <Text style={[styles.cell, { flex: 2 }]}>{item.Email}</Text>
              <View
                style={[
                  styles.cell,
                  { flex: 1.5, flexDirection: "row", justifyContent: "center" },
                ]}
              >
                <TouchableOpacity
                  onPress={() => requestPermission("EDIT_USER", item)}
                  style={{ marginRight: 10 }}
                >
                  <Text style={styles.edit}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => requestPermission("DELETE_USER", item)}
                >
                  <Text style={styles.delete}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      </View>

      {/* ADD / EDIT MODAL */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.overlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ width: "100%", alignItems: "center" }}
          >
            <View style={styles.modal}>
              <ScrollView>
                <Text style={styles.title}>
                  {editingUser ? "Edit User" : "Add User"}
                </Text>

                <TextInput
                  placeholder="Full Name"
                  value={form.Name}
                  onChangeText={(t) => setForm({ ...form, Name: t })}
                  style={styles.input}
                />

                <TextInput
                  placeholder="Username"
                  value={form.Email}
                  onChangeText={(t) =>
                    setForm({ ...form, Email: t.trim().toLowerCase() })
                  }
                  style={styles.input}
                />

                <TextInput
                  placeholder="Password"
                  secureTextEntry
                  value={form.Password}
                  onChangeText={(t) => setForm({ ...form, Password: t })}
                  style={styles.input}
                />

                <Picker
                  selectedValue={form.Role}
                  onValueChange={(value) => setForm({ ...form, Role: value })}
                >
                  <Picker.Item label="Select Role" value="" />
                  <Picker.Item label="Admin" value="Admin" />
                  <Picker.Item label="Manager" value="Manager" />
                  <Picker.Item label="Cashier" value="Cashier" />
                </Picker>

                {/* PIN always visible */}
                <TextInput
                  placeholder="PIN Code"
                  keyboardType="numeric"
                  secureTextEntry
                  value={form.Pin}
                  onChangeText={(t) => setForm({ ...form, Pin: t })}
                  style={styles.input}
                />

                <TouchableOpacity style={styles.saveBtn} onPress={saveUser}>
                  <Text style={{ color: "#fff" }}>Save</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setModalVisible(false)}
                  style={{ marginTop: 10 }}
                >
                  <Text style={{ textAlign: "center" }}>Cancel</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* PIN PERMISSION MODAL */}
      <PinPermissionModal
        visible={pinVisible}
        onSuccess={handlePinSuccess}
        onCancel={() => {
          setPinVisible(false);
          setPendingAction(null);
        }}
      />
    </View>
  );
}

// ====== STYLES ====== (unchanged)

// ====== STYLES ======
const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#EEF3F9" },
  topBar: { flexDirection: "row", marginBottom: 10 },
  search: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 8,
  },
  addBtn: {
    backgroundColor: "#2979FF",
    padding: 10,
    marginLeft: 10,
    borderRadius: 8,
  },
  table: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 0, // remove extra padding to fit width
  },

  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#2979FF",
    paddingVertical: 12,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },

  headerCell: {
    flex: 1,
    fontWeight: "bold",
    fontSize: 16,
    color: "#fff",
    textAlign: "center",
    paddingHorizontal: 5,
  },

  row: {
    flexDirection: "row",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#eee",
    alignItems: "center",
  },

  cell: {
    fontSize: 16,
    textAlign: "center",
    paddingHorizontal: 5,
  },

  edit: { color: "#FFA000" },
  delete: { color: "#D32F2F" },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modal: {
    width: "90%",
    maxHeight: "85%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    marginBottom: 10,
    borderRadius: 6,
  },
  saveBtn: {
    backgroundColor: "#2979FF",
    padding: 12,
    alignItems: "center",
    borderRadius: 6,
    marginTop: 10,
  },
  title: { fontSize: 20, fontWeight: "bold", marginBottom: 15 },
});
