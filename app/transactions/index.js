// app/transactions/index.js
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Dimensions,
  Modal,
  Alert,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSQLiteContext } from "expo-sqlite";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import XLSX from "xlsx";

export default function Transactions() {
  const db = useSQLiteContext();

  const [transactions, setTransactions] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [fromDate, setFromDate] = useState(new Date());
  const [toDate, setToDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(null); // "from" | "to"
  const [selectedTransactionProducts, setSelectedTransactionProducts] =
    useState([]);
  const [productModalVisible, setProductModalVisible] = useState(false);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Summary totals
  const [totalAmount, setTotalAmount] = useState(0);

  useEffect(() => {
    applyQuickFilter("today");
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      applyQuickFilter("today");
    }, []),
  );

  // Quick filter buttons
  const applyQuickFilter = (type) => {
    const now = new Date();
    let start, end;

    switch (type) {
      case "today":
        start = new Date(now);
        start.setHours(0, 0, 0, 0);
        end = new Date(now);
        end.setHours(23, 59, 59, 999);
        break;
      case "week":
        const day = now.getDay(); // 0-6
        start = new Date(now);
        start.setDate(now.getDate() - day);
        start.setHours(0, 0, 0, 0);
        end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        break;
      case "month":
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        end.setHours(23, 59, 59, 999);
        break;
      default:
        start = today;
        end = new Date();
    }

    setFromDate(start);
    setToDate(end);
    loadTransactions(start, end);
  };

  // Load transactions from SQLite using SQL date filtering
  const loadTransactions = async (from = fromDate, to = toDate) => {
    try {
      const query = `
        SELECT st.TransactionID, st.TransactionNumber, st.TransactionDate,
               st.TotalAmount, st.PaymentType, u.Name as UserName
        FROM SalesTransactions st
        JOIN Users u ON st.UserID = u.UserID
        WHERE st.TransactionDate BETWEEN ? AND ?
        ORDER BY st.TransactionID DESC
      `;
      const result = await db.getAllAsync(query, [
        from.toISOString(),
        to.toISOString(),
      ]);
      setTransactions(result);

      // Calculate summary total
      const total = result.reduce((acc, t) => acc + Number(t.TotalAmount), 0);
      setTotalAmount(total);
    } catch (error) {
      console.error("Error loading transactions:", error);
    }
  };

  // View products in a sale
  const viewSaleProducts = async (transactionId) => {
    try {
      const products = await db.getAllAsync(
        `SELECT od.Quantity, od.UnitPrice, od.Discount, od.DiscountType, p.Name
         FROM OrderDetails od
         JOIN Products p ON od.ProductID = p.ProductID
         WHERE od.TransactionID = ?`,
        [transactionId],
      );

      const productsWithDiscount = products.map((p) => ({
        ...p,
        Discount: p.Discount || 0,
      }));

      setSelectedTransactionProducts(productsWithDiscount);
      setProductModalVisible(true);
    } catch (error) {
      console.error("Error loading sale products:", error);
    }
  };

  // Export transactions as CSV
  const exportTransactions = async () => {
    if (!transactions.length) {
      Alert.alert("No transactions to export!");
      return;
    }

    try {
      const wsData = transactions.map((t) => ({
        "Transaction Number": t.TransactionNumber,
        User: t.UserName,
        Date: t.TransactionDate?.slice(0, 10),
        "Total Amount": t.TotalAmount,
        "Payment Type": t.PaymentType,
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(wsData);
      XLSX.utils.book_append_sheet(wb, ws, "Transactions");

      const wbout = XLSX.write(wb, { type: "base64", bookType: "xlsx" });

      // Use documentDirectory for Android & iOS
      const fileUri = FileSystem.documentDirectory + "Transactions.xlsx";

      await FileSystem.writeAsStringAsync(fileUri, wbout, {
        encoding: FileSystem.EncodingType.Base64, // <--- fixed here
      });

      // Share the file
      await Sharing.shareAsync(fileUri, {
        mimeType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        dialogTitle: "Share your transactions",
        UTI: "com.microsoft.excel.xlsx",
      });
    } catch (error) {
      console.log("Export error:", error);
      Alert.alert("Export failed", error.message);
    }
  };

  const ListHeader = () => (
    <View style={[styles.row, styles.headerRow]}>
      <Text style={[styles.cell, styles.headerCell, { flex: 2 }]}>
        Transaction #
      </Text>
      <Text style={[styles.cell, styles.headerCell, { flex: 2 }]}>User</Text>
      <Text style={[styles.cell, styles.headerCell, { flex: 2 }]}>Date</Text>
      <Text style={[styles.cell, styles.headerCell, { flex: 1 }]}>Total</Text>
      <Text style={[styles.cell, styles.headerCell, { flex: 1 }]}>Payment</Text>
      <Text style={[styles.cell, styles.headerCell, { flex: 1 }]}>Action</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.main}>
        {/* Quick Filters & Search */}
        <View style={styles.topBar}>
          <TextInput
            placeholder="Search Transaction Number..."
            value={searchText}
            onChangeText={setSearchText}
            style={styles.search}
          />

          <View style={styles.quickBtnsContainer}>
            <TouchableOpacity
              style={styles.quickBtn}
              onPress={() => applyQuickFilter("today")}
            >
              <Text style={styles.quickBtnText}>Today</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickBtn}
              onPress={() => applyQuickFilter("week")}
            >
              <Text style={styles.quickBtnText}>This Week</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickBtn}
              onPress={() => applyQuickFilter("month")}
            >
              <Text style={styles.quickBtnText}>This Month</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.exportBtn}
              onPress={exportTransactions}
            >
              <Text style={styles.quickBtnText}>Export</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Summary Total */}
        <View style={styles.summary}>
          <Text style={styles.summaryText}>
            Total Amount: ₱{totalAmount.toFixed(2)}
          </Text>
        </View>

        {/* Transactions Table */}
        <View style={styles.table}>
          <FlatList
            data={transactions.filter((t) =>
              t.TransactionNumber?.toLowerCase().includes(
                searchText.toLowerCase(),
              ),
            )}
            keyExtractor={(item) => item.TransactionID.toString()}
            ListHeaderComponent={ListHeader}
            stickyHeaderIndices={[0]}
            renderItem={({ item }) => (
              <View style={styles.row}>
                <Text style={[styles.cell, { flex: 2 }]}>
                  {item.TransactionNumber}
                </Text>
                <Text style={[styles.cell, { flex: 2 }]}>{item.UserName}</Text>
                <Text style={[styles.cell, { flex: 2 }]}>
                  {item.TransactionDate?.slice(0, 10)}
                </Text>
                <Text style={[styles.cell, { flex: 1 }]}>
                  ₱{item.TotalAmount.toFixed(2)}
                </Text>
                <Text style={[styles.cell, { flex: 1 }]}>
                  {item.PaymentType}
                </Text>
                <View style={{ flex: 1, alignItems: "center" }}>
                  <TouchableOpacity
                    style={styles.viewBtn}
                    onPress={() => viewSaleProducts(item.TransactionID)}
                  >
                    <Text style={{ color: "#fff" }}>View</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
        </View>

        {/* Product Modal */}
        <Modal
          visible={productModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setProductModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Products in Sale</Text>
              <FlatList
                data={selectedTransactionProducts}
                keyExtractor={(item, index) => index.toString()}
                renderItem={({ item }) => (
                  <View style={styles.productRow}>
                    <Text style={styles.productCell}>{item.Name}</Text>
                    <Text style={styles.productCell}>Qty: {item.Quantity}</Text>
                    <Text style={styles.productCell}>
                      ₱{item.UnitPrice.toFixed(2)}
                    </Text>
                    <Text style={styles.productCell}>
                      {item.DiscountType === "₱"
                        ? `Discount ₱${item.Discount.toFixed(2)}`
                        : `Discount ${item.Discount.toFixed(2)}%`}
                    </Text>
                  </View>
                )}
              />
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setProductModalVisible(false)}
              >
                <Text style={{ color: "#fff" }}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </View>
  );
}

const screenWidth = Dimensions.get("window").width;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#EEF3F9",
    padding: 10,
    marginTop: 20,
  },
  main: { flex: 1, padding: 16 },
  topBar: {
    flexDirection: "row", // make search and buttons side by side
    alignItems: "center",
    marginBottom: 10,
    flexWrap: "wrap", // wrap quick buttons to next line if needed
  },
  search: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40, // explicit height
  },
  quickBtnsContainer: {
    flexDirection: "row",
    marginLeft: 10,
    flexWrap: "wrap",
  },
  quickBtn: {
    backgroundColor: "#2979FF",
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginLeft: 6,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  quickBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "center",
  },
  exportBtn: {
    backgroundColor: "#4CAF50",
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginLeft: 6,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  summary: { paddingVertical: 6 },
  summaryText: { fontSize: 16, fontWeight: "bold" },
  table: { flex: 1, backgroundColor: "#fff", borderRadius: 12, padding: 10 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  cell: { fontSize: 15, textAlign: "center" },
  headerRow: {
    backgroundColor: "#F4F6FA",
    borderBottomWidth: 2,
    borderColor: "#000",
  },
  headerCell: { fontWeight: "bold", textAlign: "center" },
  viewBtn: {
    backgroundColor: "#2979FF",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  modalContainer: {
    flex: 1,
    maxHeight: "90%",
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "90%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },
  productRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  productCell: { fontSize: 16, flex: 1 },
  closeBtn: {
    backgroundColor: "#2979FF",
    padding: 12,
    marginTop: 10,
    borderRadius: 8,
    alignItems: "center",
  },
});
