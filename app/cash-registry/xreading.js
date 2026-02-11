import React, { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet } from "react-native";
import { useSQLiteContext } from "expo-sqlite";

export default function CashRegistryXReading({ route }) {
  const { shift } = route.params;
  const db = useSQLiteContext();
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    const result = await db.getAllAsync(
      `SELECT * FROM SalesTransactions WHERE date(TransactionDate) = date(?)`,
      [shift.OpenedAt],
    );
    setTransactions(result);
  };

  const renderRow = ({ item, index }) => (
    <View
      style={[styles.row, index % 2 === 0 ? styles.rowEven : styles.rowOdd]}
    >
      <Text style={[styles.cell, { flex: 0.5 }]}>{index + 1}</Text>
      <Text style={[styles.cell, { flex: 2 }]}>{item.TransactionNumber}</Text>
      <Text style={[styles.cell, { flex: 1 }]}>
        {item.TotalAmount.toFixed(2)}
      </Text>
      <Text style={[styles.cell, { flex: 2 }]}>
        {new Date(item.TransactionDate).toLocaleString()}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Shift Info */}
      <View style={styles.shiftInfo}>
        <Text>Shift By: {shift.OpenedByUser}</Text>
        <Text>Opened At: {new Date(shift.OpenedAt).toLocaleString()}</Text>
        <Text>
          Current Cash: ₱{(shift.ClosingCash || shift.OpeningCash).toFixed(2)}
        </Text>
      </View>

      {/* Transactions Table */}
      <View style={styles.table}>
        {/* HEADER */}
        <View style={styles.headerRow}>
          <Text style={[styles.headerCell, { flex: 0.5 }]}>#</Text>
          <Text style={[styles.headerCell, { flex: 2 }]}>Transaction No.</Text>
          <Text style={[styles.headerCell, { flex: 1 }]}>Amount</Text>
          <Text style={[styles.headerCell, { flex: 2 }]}>Date</Text>
        </View>

        <FlatList
          data={transactions}
          keyExtractor={(item) => item.TransactionID.toString()}
          renderItem={renderRow}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#EEF3F9" },
  shiftInfo: { marginBottom: 10, alignItems: "flex-start" },

  table: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
  },
  headerRow: {
    flexDirection: "row",
    backgroundColor: "#2979FF",
    paddingVertical: 12,
  },
  headerCell: { color: "#fff", fontWeight: "bold", textAlign: "center" },
  row: {
    flexDirection: "row",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  rowEven: { backgroundColor: "#fff" },
  rowOdd: { backgroundColor: "#f9f9f9" },
  cell: { textAlign: "center", fontSize: 14 },
});
