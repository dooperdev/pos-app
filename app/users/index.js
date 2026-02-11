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

export default function UserPage() {
  const db = useSQLiteContext();

  // ====== STATE ======
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
    const result = await db.getAllAsync("SELECT * FROM Users");
    setUsers(result);
  };

  // ====== RESET FORM ======
  const resetForm = () => {
    setForm({
      Name: "",
      Role: "",
      Email: "",
      Password: "",
      Pin: "",
    });
  };

  // ====== REQUEST PIN PERMISSION ======
  const requestPermission = (type, payload = null) => {
    setPendingAction({ type, payload });
    setPinVisible(true);
  };

  // ====== HANDLE PIN SUCCESS ======
  const handlePinSuccess = () => {
    if (!pendingAction) return;

    const { type, payload } = pendingAction;

    setPinVisible(false);
    setPendingAction(null);

    switch (type) {
      case "ADD_USER":
        setEditingUser(null);
        resetForm();
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
        deleteUserFromDB(payload.UserID);
        break;

      default:
        break;
    }
  };

  // ====== SAVE USER ======
  const saveUser = async () => {
    // Validation
    if (!form.Name || !form.Email || !form.Password || !form.Role) {
      Alert.alert("Validation", "All fields are required.");
      return;
    }
    if ((form.Role === "Admin" || form.Role === "Manager") && !form.Pin) {
      Alert.alert("Validation", "PIN is required for Admin / Manager.");
      return;
    }

    try {
      if (editingUser) {
        // Update
        await db.runAsync(
          `UPDATE Users 
           SET Name=?, Role=?, Email=?, Password=?, Pin=? 
           WHERE UserID=?`,
          [
            form.Name,
            form.Role,
            form.Email,
            form.Password,
            form.Role === "Cashier" ? null : form.Pin,
            editingUser.UserID,
          ],
        );

        // Log activity
        await logActivity(
          db,
          currentUser,
          "EDIT_USER",
          `Edited user ${editingUser.Name} (${editingUser.UserID})`,
        );
      } else {
        // Insert
        await db.runAsync(
          `INSERT INTO Users (Name, Role, Email, Password, Pin)
           VALUES (?, ?, ?, ?, ?)`,
          [
            form.Name,
            form.Role,
            form.Email,
            form.Password,
            form.Role === "Cashier" ? null : form.Pin,
          ],
        );

        // Log activity
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
      Alert.alert("Error", "Email already exists.");
    }
  };

  // ====== DELETE USER ======
  const deleteUserFromDB = async (id) => {
    await db.runAsync("DELETE FROM Users WHERE UserID=?", [id]);
    await logActivity(
      db,
      currentUser,
      "DELETE_USER",
      `Deleted user ${user.Name} (${user.UserID})`,
    );
    loadUsers();
  };

  // ====== UI ======
  const filteredUsers = users.filter((u) =>
    u.Name.toLowerCase().includes(search.toLowerCase()),
  );

  const showPin = form.Role === "Admin" || form.Role === "Manager";

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
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => item.UserID.toString()}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Text style={styles.cell}>{item.Name}</Text>
              <Text style={styles.cell}>{item.Role}</Text>
              <Text style={styles.cell}>{item.Email}</Text>

              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => requestPermission("EDIT_USER", item)}
              >
                <Text style={styles.edit}>Edit</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => requestPermission("DELETE_USER", item)}
              >
                <Text style={styles.delete}>Delete</Text>
              </TouchableOpacity>
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
                  placeholder="Email"
                  value={form.Email}
                  onChangeText={(t) => setForm({ ...form, Email: t })}
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
                  onValueChange={(value) =>
                    setForm({
                      ...form,
                      Role: value,
                      Pin: value === "Cashier" ? "" : form.Pin,
                    })
                  }
                >
                  <Picker.Item label="Select Role" value="" />
                  <Picker.Item label="Admin" value="Admin" />
                  <Picker.Item label="Manager" value="Manager" />
                  <Picker.Item label="Cashier" value="Cashier" />
                </Picker>

                {showPin && (
                  <TextInput
                    placeholder="PIN Code"
                    keyboardType="numeric"
                    secureTextEntry
                    value={form.Pin}
                    onChangeText={(t) => setForm({ ...form, Pin: t })}
                    style={styles.input}
                  />
                )}

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
  table: { flex: 1, backgroundColor: "#fff", borderRadius: 12, padding: 10 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  cell: { flex: 1 },
  editBtn: { marginRight: 15 },
  deleteBtn: {},
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
    backgroundColor: "#2E7D32",
    padding: 12,
    alignItems: "center",
    borderRadius: 6,
    marginTop: 10,
  },
  title: { fontSize: 20, fontWeight: "bold", marginBottom: 15 },
});
