// app/cash-registry/list.js

import React, { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet } from "react-native";
import { useSQLiteContext } from "expo-sqlite";

export default function CashRegistryList() {
  const db = useSQLiteContext();
  const [registryList, setRegistryList] = useState([]);

  useEffect(() => {
    loadRegistry();
  }, []);

  const loadRegistry = async () => {
    const result = await db.getAllAsync(`
    SELECT cr.*,
           uOpen.Name as OpenedByUser,
           uClose.Name as ClosedByUser,
           IFNULL(cr.ClosingCash, 0) - IFNULL(cr.ExpectedCash, 0) as Difference
    FROM CashRegistry cr
    LEFT JOIN Users uOpen ON cr.OpenedBy = uOpen.UserID
    LEFT JOIN Users uClose ON cr.ClosedBy = uClose.UserID
    ORDER BY cr.RegistryID DESC
  `);

    setRegistryList(result);
  };

  const renderRow = ({ item }) => {
    const diff = Number(item.Difference || 0);
    const openedAt = item.OpenedAt
      ? new Date(item.OpenedAt).toLocaleString()
      : "-";
    const closedAt = item.ClosedAt
      ? new Date(item.ClosedAt).toLocaleString()
      : "-";

    return (
      <View style={styles.row}>
        <Text style={[styles.cell, { flex: 0.6 }]}>{item.RegistryID}</Text>
        <Text style={[styles.cell, { flex: 1.2 }]}>
          ₱{Number(item.OpeningCash).toFixed(2)}
        </Text>
        <Text style={[styles.cell, { flex: 1.2 }]}>
          ₱{Number(item.ExpectedCash || 0).toFixed(2)}
        </Text>
        <Text style={[styles.cell, { flex: 1.2 }]}>
          ₱{Number(item.ClosingCash || 0).toFixed(2)}
        </Text>
        <Text
          style={[
            styles.cell,
            { flex: 1.2 },
            diff < 0
              ? { color: "red" }
              : diff > 0
                ? { color: "green" }
                : { color: "#000" },
          ]}
        >
          ₱{diff.toFixed(2)}
        </Text>
        <Text style={[styles.cell, { flex: 1 }]}>{item.Status}</Text>
        <Text style={[styles.cell, { flex: 1.2 }]}>{item.OpenedByUser}</Text>
        <Text style={[styles.cell, { flex: 1.2 }]}>
          {item.ClosedByUser || "-"}
        </Text>
        <Text style={[styles.cell, { flex: 1.5 }]}>{openedAt}</Text>
        <Text style={[styles.cell, { flex: 1.5 }]}>{closedAt}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.table}>
        {/* HEADER */}
        <View style={styles.headerRow}>
          <Text style={[styles.headerCell, { flex: 0.6 }]}>ID</Text>
          <Text style={[styles.headerCell, { flex: 1.2 }]}>Opening</Text>
          <Text style={[styles.headerCell, { flex: 1.2 }]}>Expected</Text>
          <Text style={[styles.headerCell, { flex: 1.2 }]}>Closing</Text>
          <Text style={[styles.headerCell, { flex: 1.2 }]}>Difference</Text>
          <Text style={[styles.headerCell, { flex: 1 }]}>Status</Text>
          <Text style={[styles.headerCell, { flex: 1.2 }]}>Opened By</Text>
          <Text style={[styles.headerCell, { flex: 1.2 }]}>Closed By</Text>
          <Text style={[styles.headerCell, { flex: 1.5 }]}>Start DateTime</Text>
          <Text style={[styles.headerCell, { flex: 1.5 }]}>End DateTime</Text>
        </View>

        <FlatList
          data={registryList}
          keyExtractor={(item) => item.RegistryID.toString()}
          renderItem={renderRow}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#EEF3F9" },
  table: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
  },
  headerRow: {
    flexDirection: "row",
    backgroundColor: "#2979FF",
    paddingVertical: 14,
  },
  headerCell: { color: "#fff", fontWeight: "bold", textAlign: "center" },
  row: {
    flexDirection: "row",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  cell: { textAlign: "center", fontSize: 14 },
});
