// app/dashboard/index.js
import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, Dimensions } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSQLiteContext } from "expo-sqlite";

export default function Dashboard() {
  const db = useSQLiteContext();

  const [totalSales, setTotalSales] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);
  const [transactionsCount, setTransactionsCount] = useState(0);
  const [topProducts, setTopProducts] = useState([]);
  const [profitToday, setProfitToday] = useState(0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setHours(23, 59, 59, 999);

  useEffect(() => {
    loadDashboardData();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadDashboardData();
    }, []),
  );

  const loadDashboardData = async () => {
    try {
      // Total Sales Today
      const salesResult = await db.getAllAsync(
        `SELECT SUM(TotalAmount) as Total FROM SalesTransactions
         WHERE TransactionDate BETWEEN ? AND ?`,
        [today.toISOString(), tomorrow.toISOString()],
      );
      const todaySales = salesResult[0]?.Total || 0;
      setTotalSales(todaySales);

      // Total Expense Today
      const expenseResult = await db.getAllAsync(
        `SELECT SUM(Amount) as Total FROM Expenses
         WHERE CreatedAt BETWEEN ? AND ?`,
        [today.toISOString(), tomorrow.toISOString()],
      );
      const todayExpense = expenseResult[0]?.Total || 0;
      setTotalExpense(todayExpense);

      // Today's Profit
      const todayProfit = todaySales - todayExpense;
      setProfitToday(todayProfit);

      // Number of Transactions Today
      const txnResult = await db.getAllAsync(
        `SELECT COUNT(*) as Count FROM SalesTransactions
         WHERE TransactionDate BETWEEN ? AND ?`,
        [today.toISOString(), tomorrow.toISOString()],
      );
      setTransactionsCount(txnResult[0]?.Count || 0);

      // Top Products Today
      const productsResult = await db.getAllAsync(
        `SELECT p.Name, SUM(od.Quantity) as SoldQty
         FROM OrderDetails od
         JOIN Products p ON od.ProductID = p.ProductID
         JOIN SalesTransactions st ON od.TransactionID = st.TransactionID
         WHERE st.TransactionDate BETWEEN ? AND ?
         GROUP BY p.Name
         ORDER BY SoldQty DESC
         LIMIT 5`,
        [today.toISOString(), tomorrow.toISOString()],
      );
      setTopProducts(productsResult);
    } catch (error) {
      console.error("Dashboard load error:", error);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 30 }}
    >
      {/* Widgets Row */}
      <View style={styles.widgetsContainer}>
        <View style={[styles.widget, { backgroundColor: "#2979FF" }]}>
          <Text style={styles.widgetTitle}>Total Sales</Text>
          <Text style={styles.widgetValue}>₱{totalSales.toFixed(2)}</Text>
        </View>
        <View style={[styles.widget, { backgroundColor: "#FF5722" }]}>
          <Text style={styles.widgetTitle}>Total Expense</Text>
          <Text style={styles.widgetValue}>₱{totalExpense.toFixed(2)}</Text>
        </View>
        <View style={[styles.widget, { backgroundColor: "#4CAF50" }]}>
          <Text style={styles.widgetTitle}>Today's Profit</Text>
          <Text style={styles.widgetValue}>₱{profitToday.toFixed(2)}</Text>
        </View>
        <View style={[styles.widget, { backgroundColor: "#FFC107" }]}>
          <Text style={styles.widgetTitle}>Transactions</Text>
          <Text style={styles.widgetValue}>{transactionsCount}</Text>
        </View>
      </View>

      {/* Top Products Table */}
      <Text style={styles.sectionTitle}>Top Products Today</Text>
      <View style={styles.table}>
        <View style={[styles.row, styles.headerRow]}>
          <Text
            style={[
              styles.cell,
              { flex: 3, color: "#fff", fontWeight: "bold" },
            ]}
          >
            Product
          </Text>
          <Text
            style={[
              styles.cell,
              { flex: 1, color: "#fff", fontWeight: "bold" },
            ]}
          >
            Qty Sold
          </Text>
        </View>
        {topProducts.map((item, index) => (
          <View style={styles.row} key={index}>
            <Text style={[styles.cell, { flex: 3 }]}>{item.Name}</Text>
            <Text style={[styles.cell, { flex: 1 }]}>{item.SoldQty}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#EEF3F9", padding: 16 },
  widgetsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  widget: {
    width: "23%", // four widgets in one line
    marginVertical: 6,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
  },
  widgetTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "center",
  },
  widgetValue: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 6,
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 12,
    marginBottom: 6,
  },
  table: { backgroundColor: "#fff", borderRadius: 12, padding: 10 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  headerRow: { backgroundColor: "#2979FF", borderBottomWidth: 2 },
  cell: { fontSize: 15, textAlign: "center" },
});
