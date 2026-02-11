import React from "react";
import {
  Modal,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from "react-native";

export default function CartModal({
  visible,
  onClose,
  cart,
  onIncrease,
  onDecrease,
  onRemove,
  onDiscount,
}) {
  // Calculate the total for a single item considering discount
  const getItemTotal = (item) => {
    const price = Number(item.RetailPrice || 0); // use RetailPrice from cart
    const qty = Number(item.qty || 0);
    let total = price * qty;

    if (item.discountType === "%") {
      total -= total * ((Number(item.discount) || 0) / 100);
    } else {
      total -= Number(item.discount) || 0;
    }

    return Math.max(total, 0);
  };

  // Subtotal: sum of all items without discount
  const subtotal = cart.reduce(
    (sum, item) => sum + Number(item.RetailPrice || 0) * Number(item.qty || 0),
    0,
  );

  // Total discount: sum of discounts applied
  const totalDiscount = cart.reduce(
    (sum, item) =>
      sum +
      (Number(item.RetailPrice || 0) * Number(item.qty || 0) -
        getItemTotal(item)),
    0,
  );

  // Final total after discount
  const total = subtotal - totalDiscount;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>Cart</Text>

          <FlatList
            data={cart}
            keyExtractor={(item) => item.key} // <-- use unique key now
            ListEmptyComponent={<Text>No items in cart</Text>}
            renderItem={({ item }) => (
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{item.Name}</Text>
                  <Text>₱{Number(item.RetailPrice || 0).toFixed(2)}</Text>

                  <TouchableOpacity
                    style={styles.discountBtn}
                    onPress={() => onDiscount(item)}
                  >
                    <Text style={styles.discountText}>Discount</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.qtyBox}>
                  <TouchableOpacity
                    style={styles.qtyBtn}
                    onPress={() => onDecrease(item)}
                  >
                    <Text>➖</Text>
                  </TouchableOpacity>

                  <Text style={styles.qty}>{item.qty}</Text>

                  <TouchableOpacity
                    style={styles.qtyBtn}
                    onPress={() => onIncrease(item.key)}
                  >
                    <Text>➕</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.removeBtn}
                  onPress={() => onRemove(item)}
                >
                  <Text style={{ color: "#fff" }}>✕</Text>
                </TouchableOpacity>
              </View>
            )}
          />

          {/* Totals */}
          <View style={styles.summary}>
            <Text>Subtotal: ₱{subtotal.toFixed(2)}</Text>
            <Text>Discount: ₱{totalDiscount.toFixed(2)}</Text>
            <Text style={styles.total}>Total: ₱{total.toFixed(2)}</Text>
          </View>

          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeText}>Close</Text>
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
    width: "70%",
    maxHeight: "90%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    flexDirection: "column",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 15,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  name: {
    fontWeight: "bold",
  },
  qtyBox: {
    flexDirection: "row",
    alignItems: "center",
  },
  qtyBtn: {
    padding: 6,
    borderWidth: 1,
    borderRadius: 6,
    marginHorizontal: 5,
  },
  qty: {
    minWidth: 30,
    textAlign: "center",
  },
  removeBtn: {
    marginLeft: 10,
    backgroundColor: "#E53935",
    padding: 8,
    borderRadius: 6,
  },
  discountBtn: {
    marginTop: 4,
    backgroundColor: "#2979FF",
    padding: 4,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  discountText: {
    color: "#fff",
    fontSize: 12,
  },
  summary: {
    marginTop: 10,
  },
  total: {
    fontSize: 18,
    fontWeight: "bold",
  },
  closeBtn: {
    marginTop: 20,
    backgroundColor: "#2979FF",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  closeText: {
    color: "#fff",
    fontSize: 16,
  },
});
