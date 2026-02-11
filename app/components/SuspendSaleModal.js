// app/components/SuspendSaleModal.js
import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";

export default function SuspendSaleModal({
  visible,
  onClose,
  suspendList,
  db,
  setCart,
}) {
  const [sales, setSales] = useState([]);

  useEffect(() => {
    if (visible) loadSuspendSales();
  }, [visible]);

  const loadSuspendSales = async () => {
    try {
      const result = await db.getAllAsync(
        "SELECT * FROM SuspendSales ORDER BY CreatedAt DESC",
      );
      setSales(result);
    } catch (error) {
      console.error("Error loading suspend sales:", error);
    }
  };

  const viewItems = async (suspendId) => {
    try {
      const items = await db.getAllAsync(
        "SELECT * FROM SuspendSaleItems WHERE SuspendID = ?",
        [suspendId],
      );

      let message = items
        .map(
          (i) =>
            `${i.Name} | Qty: ${i.Quantity} | Price: ₱${i.UnitPrice.toFixed(
              2,
            )} | Disc: ${i.Discount}${i.DiscountType}`,
        )
        .join("\n");

      Alert.alert("Suspended Items", message || "No items found");
    } catch (error) {
      console.error("Error viewing suspend items:", error);
    }
  };

  const continueSale = async (suspendId) => {
    try {
      const items = await db.getAllAsync(
        "SELECT * FROM SuspendSaleItems WHERE SuspendID = ?",
        [suspendId],
      );

      // Map items into cart format
      const newCart = items.map((i) => ({
        ProductID: i.ProductID,
        Name: i.Name,
        RetailPrice: i.UnitPrice,
        qty: i.Quantity,
        discount: i.Discount,
        discountType: i.DiscountType,
        key: `${i.ProductID}-${Date.now()}`,
      }));

      setCart(newCart);

      // Optionally delete the suspended sale after continuing
      await db.runAsync("DELETE FROM SuspendSaleItems WHERE SuspendID = ?", [
        suspendId,
      ]);
      await db.runAsync("DELETE FROM SuspendSales WHERE SuspendID = ?", [
        suspendId,
      ]);

      Alert.alert("Sale Continued", "Suspended sale loaded into cart");
      onClose();
    } catch (error) {
      console.error("Error continuing sale:", error);
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.saleText}>ID: {item.SuspendID}</Text>
        <Text style={styles.saleText}>
          Total: ₱{Number(item.TotalAmount).toFixed(2)}
        </Text>
        <Text style={styles.saleText}>
          Date: {new Date(item.CreatedAt).toLocaleString()}
        </Text>
      </View>

      <View style={styles.buttonsContainer}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => viewItems(item.SuspendID)}
        >
          <Text style={styles.buttonText}>View</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={() => continueSale(item.SuspendID)}
        >
          <Text style={styles.buttonText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <Text style={styles.title}>Suspended Sales</Text>

        {sales.length === 0 ? (
          <Text style={styles.emptyText}>No suspended sales found.</Text>
        ) : (
          <FlatList
            data={sales}
            keyExtractor={(item) => item.SuspendID.toString()}
            renderItem={renderItem}
          />
        )}

        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Text style={styles.buttonText}>Close</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#EEF3F9",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    padding: 15,
    marginBottom: 10,
    borderRadius: 10,
    alignItems: "center",
    elevation: 2,
  },
  saleText: {
    fontSize: 16,
    marginBottom: 4,
  },
  buttonsContainer: {
    flexDirection: "row",
    gap: 8,
  },
  button: {
    backgroundColor: "#2979FF",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  closeBtn: {
    backgroundColor: "#2979FF",
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 20,
  },
  emptyText: {
    textAlign: "center",
    marginTop: 50,
    fontSize: 16,
    color: "#555",
  },
});
