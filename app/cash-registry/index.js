import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
} from "react-native";
import { useSQLiteContext } from "expo-sqlite";
import { useAuth } from "../context/AuthContext";
import { logActivity } from "../utils/activityLogger";
import PinPermissionModal from "../components/PinPermissionModal"; // <-- Pin modal component

export default function CashRegistry({ navigation }) {
  const db = useSQLiteContext();
  const { user } = useAuth();

  const [currentShift, setCurrentShift] = useState(null);
  const [amount, setAmount] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [actionType, setActionType] = useState(""); // "IN" | "OUT" | "START" | "END"
  const [pinVisible, setPinVisible] = useState(false); // PIN modal visible
  const [pendingAction, setPendingAction] = useState(null); // store action to perform after PIN

  useEffect(() => {
    loadCurrentShift();
  }, []);

  const loadCurrentShift = async () => {
    const result = await db.getAllAsync(`
      SELECT cr.*, u.Name as OpenedByUser, uc.Name as ClosedByUser
      FROM CashRegistry cr
      LEFT JOIN Users u ON cr.OpenedBy = u.UserID
      LEFT JOIN Users uc ON cr.ClosedBy = uc.UserID
      WHERE cr.Status = 'OPEN'
      ORDER BY cr.RegistryID DESC
      LIMIT 1
    `);
    setCurrentShift(result[0] || null);
  };

  // --- PIN Validation Trigger ---
  const requestPin = (type) => {
    setPendingAction(type);
    setPinVisible(true);
  };

  const handlePinSuccess = () => {
    setPinVisible(false);
    if (
      pendingAction === "IN" ||
      pendingAction === "OUT" ||
      pendingAction === "START" ||
      pendingAction === "END"
    ) {
      setActionType(pendingAction);
      setAmount("");
      setModalVisible(true);
    }
    setPendingAction(null);
  };

  const openCashModal = (type) => requestPin(type);

  // --- Handle Cash In/Out ---
  const handleCashInOut = async () => {
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid number.");
      return;
    }

    try {
      const [shift] = await db.getAllAsync(
        `SELECT * FROM CashRegistry WHERE RegistryID = ?`,
        [currentShift.RegistryID],
      );
      if (!shift) throw new Error("Shift not found");

      const openingCash = shift.OpeningCash ?? 0;
      const totalCashIn = shift.TotalCashIn ?? 0;
      const totalCashOut = shift.TotalCashOut ?? 0;

      let newTotalCashIn = totalCashIn;
      let newTotalCashOut = totalCashOut;

      if (actionType === "IN") newTotalCashIn += amt;
      else newTotalCashOut += amt;

      const newClosingCash =
        openingCash +
        (shift.TotalCashSales ?? 0) +
        (shift.TotalSplitCash ?? 0) +
        newTotalCashIn -
        newTotalCashOut;
      const newExpectedCash = newClosingCash;

      await db.runAsync(
        `UPDATE CashRegistry 
         SET ClosingCash = ?, ExpectedCash = ?, TotalCashIn = ?, TotalCashOut = ? 
         WHERE RegistryID = ?`,
        [
          newClosingCash,
          newExpectedCash,
          newTotalCashIn,
          newTotalCashOut,
          shift.RegistryID,
        ],
      );

      await logActivity(
        db,
        user,
        actionType === "IN" ? "Cash In" : "Cash Out",
        `${actionType === "IN" ? "Added" : "Removed"} ₱${amt.toFixed(2)}`,
      );

      const [updatedShift] = await db.getAllAsync(
        `SELECT * FROM CashRegistry WHERE RegistryID = ?`,
        [shift.RegistryID],
      );

      setCurrentShift(updatedShift);
      setModalVisible(false);
      Alert.alert(
        "Success",
        actionType === "IN" ? "Cash Added" : "Cash Removed",
      );
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to update cash.");
    }
  };

  // --- Handle Start Shift ---
  const handleStartShift = async () => {
    const openingCash = parseFloat(amount);
    if (isNaN(openingCash) || openingCash < 0) {
      Alert.alert("Invalid Amount", "Please enter a valid opening cash.");
      return;
    }

    try {
      await db.runAsync(
        `INSERT INTO CashRegistry (OpenedBy, OpeningCash, Status, OpenedAt)
         VALUES (?, ?, 'OPEN', ?)`,
        [user.UserID, openingCash, new Date().toISOString()],
      );

      await logActivity(
        db,
        user,
        "Start Shift",
        `Opened shift with ₱${openingCash.toFixed(2)}`,
      );

      setModalVisible(false);
      loadCurrentShift();
      Alert.alert("Shift Started", `Opening Cash: ₱${openingCash.toFixed(2)}`);
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to start shift.");
    }
  };

  // Move this above handleEndShift
  const printZReading = async (shift) => {
    try {
      const transactions = await db.getAllAsync(
        `SELECT * FROM SalesTransactions WHERE date(TransactionDate) = date(?)`,
        [shift.OpenedAt],
      );

      const openingCash = shift.OpeningCash ?? 0;
      const closingCash = shift.ClosingCash ?? 0;
      const expectedCash = shift.ExpectedCash ?? 0;
      const difference = closingCash - expectedCash;

      let text = "";
      text += "====== Z-READING ======\n";
      text += `Shift By: ${user?.Name}\n`;
      text += `Opened At: ${new Date(shift.OpenedAt).toLocaleString()}\n`;
      text += `Closed At: ${shift.ClosedAt ? new Date(shift.ClosedAt).toLocaleString() : "-"}\n\n`;

      text += `Opening Cash: ₱${openingCash.toFixed(2)}\n`;
      text += `Expected Cash: ₱${expectedCash.toFixed(2)}\n`;
      text += `Closing Cash: ₱${closingCash.toFixed(2)}\n`;
      text += `Difference: ₱${difference.toFixed(2)}\n\n`;

      text += "--- Transactions ---\n";
      transactions.forEach((t, idx) => {
        text += `${idx + 1}. ${t.TransactionNumber} | ₱${t.TotalAmount.toFixed(2)}\n`;
      });

      text += "\n====================\n";
      text += "Thank you!\n";

      // Bluetooth print
      try {
        const printerList = await BluetoothEscposPrinter.getDeviceList();
        const printer = printerList[0];
        if (!printer) throw new Error("No Bluetooth printer found.");

        await BluetoothEscposPrinter.connectPrinter(
          printer.inner_mac_address || printer.mac_address,
        );
        await BluetoothEscposPrinter.printText(text, { encoding: "GBK" });
        await BluetoothEscposPrinter.openDrawer(0, 250);
        await BluetoothEscposPrinter.disconnectPrinter();
      } catch (err) {
        console.error("Bluetooth print error:", err);
        Alert.alert("Printing Failed", "Could not print Z-Reading.");
      }
    } catch (err) {
      console.error("Error generating Z-Reading:", err);
      Alert.alert("Error", "Failed to generate Z-Reading.");
    }
  };

  // --- Handle End Shift ---
  const handleEndShift = async () => {
    const closingCash = parseFloat(amount);
    if (isNaN(closingCash) || closingCash < 0) {
      Alert.alert("Invalid Amount", "Please enter a valid closing cash.");
      return;
    }

    try {
      const [shiftData] = await db.getAllAsync(
        `SELECT OpeningCash, TotalCashSales, TotalSplitCash, ExpectedCash
         FROM CashRegistry
         WHERE RegistryID = ?`,
        [currentShift?.RegistryID],
      );

      const expectedCash = shiftData?.ExpectedCash ?? 0;
      const difference = closingCash - expectedCash;

      await db.runAsync(
        `UPDATE CashRegistry
         SET Status = 'CLOSED',
             ClosingCash = ?,
             ClosedBy = ?,
             ClosedAt = ?,
             ExpectedCash = ?
         WHERE RegistryID = ?`,
        [
          closingCash,
          user?.UserID,
          new Date().toISOString(),
          expectedCash,
          currentShift?.RegistryID,
        ],
      );

      await logActivity(
        db,
        user,
        "End Shift",
        `Closed shift. Closing Cash: ₱${closingCash.toFixed(2)}, Difference: ₱${difference.toFixed(2)}`,
      );

      setModalVisible(false);
      Alert.alert(
        "Shift Closed",
        `Z-Reading Complete\nDifference: ₱${difference.toFixed(2)}`,
      );
      loadCurrentShift();

      /* printZReading({
        ...currentShift,
        ClosingCash: closingCash,
        ClosedAt: new Date().toISOString(),
        ExpectedCash: expectedCash,
      });*/
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to close shift.");
    }
  };

  const handleXReading = () => {
    if (!currentShift) {
      Alert.alert("No Open Shift", "Start a cash registry first.");
      return;
    }
    navigation.navigate("X Reading", { shift: currentShift });
  };

  return (
    <View style={styles.container}>
      {/* Table of Current Shift */}
      {currentShift ? (
        <View style={styles.tableContainer}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={[styles.headerCell, { flex: 1 }]}>Opened By</Text>
            <Text style={[styles.headerCell, { flex: 1 }]}>Opening Cash</Text>
            <Text style={[styles.headerCell, { flex: 1 }]}>Current Cash</Text>
            <Text style={[styles.headerCell, { flex: 1 }]}>Status</Text>
          </View>

          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, { flex: 1 }]}>
              {currentShift.OpenedByUser}
            </Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>
              ₱{(currentShift.OpeningCash ?? 0).toFixed(2)}
            </Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>
              ₱
              {(
                currentShift.ClosingCash ??
                currentShift.OpeningCash ??
                0
              ).toFixed(2)}
            </Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>
              {currentShift.Status}
            </Text>
          </View>
        </View>
      ) : (
        <Text style={{ marginVertical: 20 }}>No open shift</Text>
      )}

      {/* Buttons */}
      <View style={styles.bottomButtons}>
        <TouchableOpacity
          style={styles.btn}
          onPress={() => requestPin(currentShift ? "END" : "START")}
        >
          <Text style={styles.btnText}>
            {currentShift ? "⏹ End Shift" : "💰 Start Shift"}
          </Text>
        </TouchableOpacity>

        {currentShift && (
          <>
            <TouchableOpacity
              style={styles.btnSmall}
              onPress={() => requestPin("IN")}
            >
              <Text style={styles.btnText}>💰 Cash In</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.btnSmall}
              onPress={() => requestPin("OUT")}
            >
              <Text style={styles.btnText}>💸 Cash Out</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnSmall} onPress={handleXReading}>
              <Text style={styles.btnText}>🧾 X-Reading</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Cash/Shift Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalBox}>
            <Text style={{ marginBottom: 10, fontWeight: "bold" }}>
              {actionType === "IN"
                ? "Add Cash"
                : actionType === "OUT"
                  ? "Remove Cash"
                  : actionType === "START"
                    ? "Opening Cash"
                    : "Closing Cash"}
            </Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              placeholder="Enter amount"
              value={amount}
              onChangeText={setAmount}
            />
            <View style={{ flexDirection: "row", marginTop: 10 }}>
              <TouchableOpacity
                style={[styles.btn, { flex: 1, marginRight: 5 }]}
                onPress={() => {
                  if (actionType === "IN" || actionType === "OUT")
                    handleCashInOut();
                  else if (actionType === "START") handleStartShift();
                  else if (actionType === "END") handleEndShift();
                }}
              >
                <Text style={styles.btnText}>Confirm</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, { flex: 1, backgroundColor: "#ccc" }]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.btnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* PIN Modal */}
      <PinPermissionModal
        visible={pinVisible}
        title="Owner PIN Required"
        onCancel={() => setPinVisible(false)}
        onSuccess={handlePinSuccess}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#EEF3F9" },
  bottomButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginBottom: 10,
  },
  btn: {
    backgroundColor: "#2979FF",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  btnText: { color: "#fff", fontWeight: "bold" },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#00000066",
  },
  modalBox: {
    backgroundColor: "#fff",
    padding: 20,
    width: "80%",
    borderRadius: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  btnSmall: {
    backgroundColor: "#2979FF",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    alignItems: "center",
    minWidth: 80,
  },
  tableContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 20,
    overflow: "hidden",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  tableHeader: { backgroundColor: "#2979FF" },
  tableCell: { color: "#000", textAlign: "center" },
  headerCell: { color: "#fff", fontWeight: "bold", textAlign: "center" },
});
