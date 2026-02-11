import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
} from "react-native";
import { useSQLiteContext } from "expo-sqlite";
import PinPermissionModal from "../components/PinPermissionModal";

export default function Inventory() {
  const db = useSQLiteContext();

  const [inventory, setInventory] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);
  const [qty, setQty] = useState("");

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [pinVisible, setPinVisible] = useState(false);

  useEffect(() => {
    loadInventory();
  }, []);

  const loadInventory = async () => {
    const result = await db.getAllAsync(`
      SELECT Inventory.InventoryID,
             Products.ProductID,
             Products.Name,
             Inventory.QuantityInStock
      FROM Inventory
      INNER JOIN Products
      ON Products.ProductID = Inventory.ProductID
      ORDER BY Products.Name ASC
    `);

    setInventory(result);
  };

  const filtered = inventory.filter((item) =>
    item.Name.toLowerCase().includes(search.toLowerCase()),
  );

  const requestUpdate = (item) => {
    setSelectedItem(item);
    setQty(item.QuantityInStock.toString());
    setPinVisible(true);
  };

  const openEditAfterPin = () => {
    setPinVisible(false);
    setEditModalVisible(true);
  };

  const updateStock = async () => {
    if (!qty) {
      Alert.alert("Validation", "Quantity required");
      return;
    }

    await db.runAsync(
      "UPDATE Inventory SET QuantityInStock=? WHERE InventoryID=?",
      [qty, selectedItem.InventoryID],
    );

    setEditModalVisible(false);
    loadInventory();
  };

  return (
    <View style={styles.container}>
      <TextInput
        placeholder="Search product..."
        value={search}
        onChangeText={setSearch}
        style={styles.search}
      />

      <View style={styles.table}>
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.InventoryID.toString()}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Text style={{ flex: 2 }}>{item.Name}</Text>
              <Text style={{ flex: 1 }}>Stock: {item.QuantityInStock}</Text>

              <TouchableOpacity onPress={() => requestUpdate(item)}>
                <Text style={styles.edit}>Update</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      </View>

      {/* PIN PERMISSION */}
      <PinPermissionModal
        visible={pinVisible}
        title="Owner PIN Required"
        onCancel={() => setPinVisible(false)}
        onSuccess={openEditAfterPin}
      />

      {/* UPDATE MODAL */}
      <Modal visible={editModalVisible} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.title}>Update Stock</Text>

            <TextInput
              keyboardType="numeric"
              value={qty}
              onChangeText={setQty}
              style={styles.input}
            />

            <TouchableOpacity style={styles.saveBtn} onPress={updateStock}>
              <Text style={{ color: "#fff" }}>Save</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setEditModalVisible(false)}>
              <Text style={{ textAlign: "center", marginTop: 10 }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#EEF3F9",
  },
  search: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  table: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 10,
  },
  row: {
    flexDirection: "row",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#eee",
    alignItems: "center",
  },
  edit: {
    color: "#FF9800",
    marginRight: 15,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modal: {
    width: "90%",
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
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
  },
});
