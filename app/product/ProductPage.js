import React, { useState, useEffect } from "react";
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
import PinPermissionModal from "../components/PinPermissionModal"; // your PIN modal
import { logActivity } from "../utils/activityLogger"; // your logger
import { useAuth } from "../context/AuthContext";

export default function ProductPage() {
  const db = useSQLiteContext();
  const { user } = useAuth();

  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");

  // Modal & PIN states
  const [modalVisible, setModalVisible] = useState(false);
  const [pinVisible, setPinVisible] = useState(false);
  const [pendingAction, setPendingAction] = useState(null); // {type: 'add'|'edit'|'delete', data: {...}}

  const [editingProduct, setEditingProduct] = useState(null);

  const [form, setForm] = useState({
    Name: "",
    Description: "",
    SupplierID: "",
    CategoryID: "",
    RetailPrice: "",
    WholesalePrice: "",
  });

  // ================================
  // LOAD DATA
  // ================================
  useEffect(() => {
    loadSuppliers();
    loadCategories();
    loadProducts();
  }, []);

  const loadSuppliers = async () => {
    const result = await db.getAllAsync("SELECT * FROM Suppliers");
    setSuppliers(result);
  };

  const loadCategories = async () => {
    const result = await db.getAllAsync("SELECT * FROM Categories");
    setCategories(result);
  };

  const loadProducts = async () => {
    const result = await db.getAllAsync(`
      SELECT 
        p.*, 
        s.Name as SupplierName,
        c.Name as CategoryName
      FROM Products p
      LEFT JOIN Suppliers s ON p.SupplierID = s.SupplierID
      LEFT JOIN Categories c ON p.CategoryID = c.CategoryID
    `);
    setProducts(result);
  };

  // ================================
  // PERMISSION CHECK
  // ================================
  const requestPermission = (actionType, data = null) => {
    setPendingAction({ type: actionType, data });
    setPinVisible(true);
  };

  const handlePinSuccess = async () => {
    const { type, data } = pendingAction;
    setPinVisible(false);
    setPendingAction(null);

    switch (type) {
      case "add":
        setModalVisible(true);
        break;
      case "edit":
        openEdit(data);
        break;
      case "delete":
        await deleteProduct(data.ProductID);
        break;
      default:
        break;
    }
  };

  // ================================
  // SAVE PRODUCT
  // ================================
  const saveProduct = async () => {
    if (!form.Name || !form.RetailPrice) {
      Alert.alert("Error", "Please fill required fields.");
      return;
    }

    const retailPrice = parseFloat(form.RetailPrice);
    const wholesalePrice = form.WholesalePrice
      ? parseFloat(form.WholesalePrice)
      : null;

    try {
      if (editingProduct) {
        await db.runAsync(
          `UPDATE Products SET 
            Name=?, Description=?, SupplierID=?, CategoryID=?, RetailPrice=?, WholesalePrice=?
          WHERE ProductID=?`,
          [
            form.Name,
            form.Description,
            form.SupplierID,
            form.CategoryID,
            retailPrice,
            wholesalePrice,
            editingProduct.ProductID,
          ],
        );

        await logActivity(
          db,
          user,
          "Edit Product",
          `Edited product ID ${editingProduct.ProductID}`,
        );
      } else {
        const result = await db.runAsync(
          `INSERT INTO Products 
          (Name, Description, SupplierID, CategoryID, RetailPrice, WholesalePrice)
          VALUES (?, ?, ?, ?, ?, ?)`,
          [
            form.Name,
            form.Description,
            form.SupplierID,
            form.CategoryID,
            retailPrice,
            wholesalePrice,
          ],
        );

        const productId = result.lastInsertRowId;

        await db.runAsync(
          "INSERT INTO Inventory (ProductID, QuantityInStock) VALUES (?,0)",
          [productId],
        );

        await logActivity(
          db,
          user,
          "Add Product",
          `Added product ID ${productId}`,
        );
      }

      setModalVisible(false);
      setEditingProduct(null);
      resetForm();
      loadProducts();
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to save product.");
    }
  };

  // ================================
  // DELETE PRODUCT
  // ================================
  const deleteProduct = async (id) => {
    try {
      await db.runAsync("DELETE FROM Products WHERE ProductID=?", [id]);
      await logActivity(db, user, "Delete Product", `Deleted product ID ${id}`);
      loadProducts();
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to delete product.");
    }
  };

  // ================================
  // EDIT PRODUCT
  // ================================
  const openEdit = (item) => {
    setEditingProduct(item);
    setForm(item);
    setModalVisible(true);
  };

  const resetForm = () => {
    setForm({
      Name: "",
      Description: "",
      SupplierID: "",
      CategoryID: "",
      RetailPrice: "",
      WholesalePrice: "",
    });
  };

  const filteredProducts = products.filter((p) =>
    p.Name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <View style={styles.container}>
      {/* SEARCH + ADD */}
      <View style={styles.topBar}>
        <TextInput
          placeholder="Search..."
          value={search}
          onChangeText={setSearch}
          style={styles.search}
        />

        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => requestPermission("add")}
        >
          <Text style={{ color: "#fff" }}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* TABLE */}
      <View style={styles.table}>
        {/* Table Header */}
        <View style={styles.tableHeader}>
          <Text style={[styles.headerCell, { flex: 3 }]}>Product Name</Text>
          <Text style={[styles.headerCell, { flex: 2 }]}>Price</Text>
          <Text style={[styles.headerCell, { flex: 2, textAlign: "center" }]}>
            Action
          </Text>
        </View>

        {/* Table Data */}
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item.ProductID.toString()}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Text style={[styles.cell, { flex: 3 }]}>{item.Name}</Text>
              <Text style={[styles.cell, { flex: 2 }]}>
                ₱{item.RetailPrice}
              </Text>

              <View
                style={[
                  styles.cell,
                  { flex: 2, flexDirection: "row", justifyContent: "center" },
                ]}
              >
                <TouchableOpacity
                  onPress={() => requestPermission("edit", item)}
                >
                  <Text style={styles.edit}>Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => requestPermission("delete", item)}
                >
                  <Text style={styles.delete}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      </View>

      {/* MODAL */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
              <Text style={styles.title}>
                {editingProduct ? "Edit Product" : "Add Product"}
              </Text>

              <TextInput
                placeholder="Product Name"
                value={form.Name}
                onChangeText={(t) => setForm({ ...form, Name: t })}
                style={styles.input}
              />

              <TextInput
                placeholder="Description"
                value={form.Description}
                onChangeText={(t) => setForm({ ...form, Description: t })}
                style={styles.input}
              />

              <Picker
                selectedValue={form.SupplierID}
                onValueChange={(value) =>
                  setForm({ ...form, SupplierID: value })
                }
              >
                <Picker.Item label="Select Supplier" value="" />
                {suppliers.map((s) => (
                  <Picker.Item
                    key={s.SupplierID}
                    label={s.Name}
                    value={s.SupplierID}
                  />
                ))}
              </Picker>

              <Picker
                selectedValue={form.CategoryID}
                onValueChange={(value) =>
                  setForm({ ...form, CategoryID: value })
                }
              >
                <Picker.Item label="Select Category" value="" />
                {categories.map((c) => (
                  <Picker.Item
                    key={c.CategoryID}
                    label={c.Name}
                    value={c.CategoryID}
                  />
                ))}
              </Picker>

              <TextInput
                placeholder="Retail Price"
                keyboardType="numeric"
                value={form.RetailPrice?.toString()}
                onChangeText={(t) => setForm({ ...form, RetailPrice: t })}
                style={styles.input}
              />

              <TextInput
                placeholder="Wholesale Price"
                keyboardType="numeric"
                value={form.WholesalePrice?.toString()}
                onChangeText={(t) => setForm({ ...form, WholesalePrice: t })}
                style={styles.input}
              />

              <TouchableOpacity style={styles.saveBtn} onPress={saveProduct}>
                <Text style={{ color: "#fff" }}>Save</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={{ textAlign: "center", marginTop: 10 }}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* PIN PERMISSION MODAL */}
      <PinPermissionModal
        visible={pinVisible}
        onCancel={() => setPinVisible(false)}
        onSuccess={handlePinSuccess}
        title="Enter PIN for Permission"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
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
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  table: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 10,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#2979FF",
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  headerCell: {
    color: "#fff",
    fontWeight: "bold",
    textAlign: "left",
  },

  cell: { flex: 1 },
  edit: { color: "#FFA000", marginRight: 5 },
  delete: { color: "#D32F2F" },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },

  modal: {
    width: "90%", // responsive
    maxHeight: "85%", // prevents overflow
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    elevation: 10,
  },

  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    padding: 10,
    marginBottom: 10,
    borderRadius: 6,
  },
  saveBtn: {
    backgroundColor: "#2979FF",
    padding: 12,
    alignItems: "center",
    borderRadius: 6,
    marginBottom: 10,
  },
});
