import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useSQLiteContext } from "expo-sqlite";
import PinPermissionModal from "../components/PinPermissionModal";
import { logActivity } from "../utils/activityLogger";

export default function Categories({ currentUser }) {
  const db = useSQLiteContext();

  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  // PIN & Pending Action
  const [pinVisible, setPinVisible] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    const result = await db.getAllAsync(
      "SELECT * FROM Categories ORDER BY CategoryID DESC",
    );
    setCategories(result);
  };

  const filtered = categories.filter((c) =>
    c.Name.toLowerCase().includes(search.toLowerCase()),
  );

  // ===== PIN REQUEST =====
  const requestPermission = (type, category = null) => {
    setPendingAction({ type, category });
    setPinVisible(true);
  };

  const handlePinSuccess = async () => {
    if (!pendingAction) return;

    const { type, category } = pendingAction;
    setPinVisible(false);
    setPendingAction(null);

    switch (type) {
      case "ADD":
        setEditingCategory(null);
        setName("");
        setDescription("");
        setModalVisible(true);
        break;
      case "EDIT":
        setEditingCategory(category);
        setName(category.Name);
        setDescription(category.Description || "");
        setModalVisible(true);
        break;
      case "DELETE":
        deleteCategoryFromDB(category);
        break;
    }
  };

  // ===== SAVE CATEGORY =====
  const saveCategory = async () => {
    if (!name.trim()) {
      Alert.alert("Validation", "Category name is required");
      return;
    }

    try {
      if (editingCategory) {
        // UPDATE
        await db.runAsync(
          "UPDATE Categories SET Name=?, Description=? WHERE CategoryID=?",
          [name, description, editingCategory.CategoryID],
        );

        // Log edit
        await logActivity(
          db,
          currentUser,
          "Edit Category",
          `Edited category ${editingCategory.Name} (${editingCategory.CategoryID})`,
        );
      } else {
        // INSERT
        await db.runAsync(
          "INSERT INTO Categories (Name, Description) VALUES (?,?)",
          [name, description],
        );

        // Log add
        await logActivity(
          db,
          currentUser,
          "Add Category",
          `Added new category ${name}`,
        );
      }

      setModalVisible(false);
      setEditingCategory(null);
      setName("");
      setDescription("");
      loadCategories();
    } catch (err) {
      Alert.alert("Error", "Failed to save category.");
    }
  };

  // ===== DELETE CATEGORY =====
  const deleteCategoryFromDB = async (category) => {
    try {
      await db.runAsync("DELETE FROM Categories WHERE CategoryID=?", [
        category.CategoryID,
      ]);

      await logActivity(
        db,
        currentUser,
        "Delete Category",
        `Deleted category ${category.Name} (${category.CategoryID})`,
      );

      loadCategories();
    } catch (err) {
      Alert.alert("Error", "Failed to delete category.");
    }
  };

  return (
    <View style={styles.container}>
      {/* Search + Add */}
      <View style={styles.topBar}>
        <TextInput
          placeholder="Search category..."
          value={search}
          onChangeText={setSearch}
          style={styles.search}
        />
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => requestPermission("ADD")}
        >
          <Text style={{ color: "#fff" }}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* Table */}
      <View style={styles.table}>
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.CategoryID.toString()}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Text style={styles.cell}>{item.Name}</Text>
              <Text style={styles.cell}>{item.Description}</Text>

              <TouchableOpacity onPress={() => requestPermission("EDIT", item)}>
                <Text style={styles.edit}>Edit</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => requestPermission("DELETE", item)}
              >
                <Text style={styles.delete}>Delete</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      </View>

      {/* Add/Edit Modal */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.overlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ width: "100%", alignItems: "center" }}
          >
            <View style={styles.modal}>
              <ScrollView>
                <Text style={styles.title}>
                  {editingCategory ? "Edit Category" : "Add Category"}
                </Text>

                <TextInput
                  placeholder="Category Name"
                  value={name}
                  onChangeText={setName}
                  style={styles.input}
                />

                <TextInput
                  placeholder="Description"
                  value={description}
                  onChangeText={setDescription}
                  style={styles.input}
                />

                <TouchableOpacity style={styles.saveBtn} onPress={saveCategory}>
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

      {/* PIN Modal */}
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

// ===== STYLES =====
const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#EEF3F9" },

  topBar: { flexDirection: "row", marginBottom: 15 },

  search: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 12,
  },

  addBtn: {
    marginLeft: 10,
    backgroundColor: "#2979FF",
    paddingHorizontal: 20,
    justifyContent: "center",
    borderRadius: 8,
  },

  table: { flex: 1, backgroundColor: "#fff", borderRadius: 12, padding: 10 },

  row: {
    flexDirection: "row",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },

  cell: { flex: 1 },

  edit: { color: "#FF9800", marginRight: 15 },

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
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },

  saveBtn: {
    backgroundColor: "#2E7D32",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },

  title: { fontSize: 18, fontWeight: "bold", marginBottom: 15 },
});
