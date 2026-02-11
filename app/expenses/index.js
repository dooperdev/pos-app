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

export default function Expenses({ currentUser }) {
  const db = useSQLiteContext();

  const [expenses, setExpenses] = useState([]);
  const [search, setSearch] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");

  // PIN & Pending Action
  const [pinVisible, setPinVisible] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  useEffect(() => {
    loadExpenses();
  }, []);

  const loadExpenses = async () => {
    const result = await db.getAllAsync(
      "SELECT * FROM Expenses ORDER BY ExpenseID DESC",
    );
    setExpenses(result);
  };

  const filtered = expenses.filter((e) =>
    e.Title.toLowerCase().includes(search.toLowerCase()),
  );

  // ===== PIN REQUEST =====
  const requestPermission = (type, expense = null) => {
    setPendingAction({ type, expense });
    setPinVisible(true);
  };

  const handlePinSuccess = async () => {
    if (!pendingAction) return;

    const { type, expense } = pendingAction;
    setPinVisible(false);
    setPendingAction(null);

    switch (type) {
      case "ADD":
        setEditingExpense(null);
        setTitle("");
        setAmount("");
        setNotes("");
        setModalVisible(true);
        break;
      case "EDIT":
        setEditingExpense(expense);
        setTitle(expense.Title);
        setAmount(expense.Amount.toString());
        setNotes(expense.Notes || "");
        setModalVisible(true);
        break;
      case "DELETE":
        deleteExpenseFromDB(expense);
        break;
    }
  };

  // ===== SAVE EXPENSE =====
  const saveExpense = async () => {
    if (!title.trim()) {
      Alert.alert("Validation", "Expense title is required");
      return;
    }

    if (!amount || isNaN(amount)) {
      Alert.alert("Validation", "Valid amount is required");
      return;
    }

    try {
      if (editingExpense) {
        // UPDATE
        await db.runAsync(
          "UPDATE Expenses SET Title=?, Amount=?, Notes=? WHERE ExpenseID=?",
          [title, parseFloat(amount), notes, editingExpense.ExpenseID],
        );

        await logActivity(
          db,
          currentUser,
          "Edit Expense",
          `Edited expense ${editingExpense.Title} (${editingExpense.ExpenseID})`,
        );
      } else {
        // INSERT
        await db.runAsync(
          "INSERT INTO Expenses (Title, Amount, Notes) VALUES (?,?,?)",
          [title, parseFloat(amount), notes],
        );

        await logActivity(
          db,
          currentUser,
          "Add Expense",
          `Added new expense ${title}`,
        );
      }

      setModalVisible(false);
      setEditingExpense(null);
      setTitle("");
      setAmount("");
      setNotes("");
      loadExpenses();
    } catch (err) {
      Alert.alert("Error", "Failed to save expense.");
    }
  };

  // ===== DELETE EXPENSE =====
  const deleteExpenseFromDB = async (expense) => {
    try {
      await db.runAsync("DELETE FROM Expenses WHERE ExpenseID=?", [
        expense.ExpenseID,
      ]);

      await logActivity(
        db,
        currentUser,
        "Delete Expense",
        `Deleted expense ${expense.Title} (${expense.ExpenseID})`,
      );

      loadExpenses();
    } catch (err) {
      Alert.alert("Error", "Failed to delete expense.");
    }
  };

  return (
    <View style={styles.container}>
      {/* Search + Add */}
      <View style={styles.topBar}>
        <TextInput
          placeholder="Search expense..."
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
        {/* Table Header */}
        <View style={styles.tableHeader}>
          <Text style={[styles.headerCell, { flex: 2 }]}>Title</Text>
          <Text style={[styles.headerCell, { flex: 1 }]}>Amount</Text>
          <Text style={[styles.headerCell, { flex: 2 }]}>Notes</Text>
          <Text style={[styles.headerCell, { flex: 1.5 }]}>Action</Text>
        </View>

        {/* Expense Rows */}
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.ExpenseID.toString()}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Text style={[styles.cell, { flex: 2 }]}>{item.Title}</Text>
              <Text style={[styles.cell, { flex: 1 }]}>₱{item.Amount}</Text>
              <Text style={[styles.cell, { flex: 2 }]}>{item.Notes}</Text>

              {/* Action buttons */}
              <View
                style={[
                  styles.cell,
                  { flex: 1.5, flexDirection: "row", justifyContent: "center" },
                ]}
              >
                <TouchableOpacity
                  onPress={() => requestPermission("EDIT", item)}
                  style={{ marginRight: 10 }}
                >
                  <Text style={styles.edit}>Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => requestPermission("DELETE", item)}
                >
                  <Text style={styles.delete}>Delete</Text>
                </TouchableOpacity>
              </View>
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
                  {editingExpense ? "Edit Expense" : "Add Expense"}
                </Text>

                <TextInput
                  placeholder="Expense Title"
                  value={title}
                  onChangeText={setTitle}
                  style={styles.input}
                />

                <TextInput
                  placeholder="Amount"
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="numeric"
                  style={styles.input}
                />

                <TextInput
                  placeholder="Notes (optional)"
                  value={notes}
                  onChangeText={setNotes}
                  style={styles.input}
                />

                <TouchableOpacity style={styles.saveBtn} onPress={saveExpense}>
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
  tableHeader: {
    flexDirection: "row",
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderColor: "#ccc",
    backgroundColor: "#2979FF",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },

  headerCell: {
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

  edit: { color: "#FF9800" },
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
    backgroundColor: "#2979FF",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },

  title: { fontSize: 18, fontWeight: "bold", marginBottom: 15 },
});
