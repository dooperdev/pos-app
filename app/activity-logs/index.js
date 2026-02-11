// app/activitylogs/index.js
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
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSQLiteContext } from "expo-sqlite";
import DateTimePicker from "@react-native-community/datetimepicker";

export default function ActivityLogs() {
  const db = useSQLiteContext();

  const [logs, setLogs] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [filterDate, setFilterDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Modal for viewing log details
  const [selectedLog, setSelectedLog] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    loadLogs();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadLogs();
    }, []),
  );

  const loadLogs = async () => {
    try {
      const result = await db.getAllAsync(
        "SELECT * FROM ActivityLogs ORDER BY CreatedAt DESC",
      );
      setLogs(result);
    } catch (error) {
      console.error("Error loading logs:", error);
    }
  };

  const filteredLogs = logs.filter((log) => {
    const matchID = log.LogID?.toString().includes(searchText);
    const matchUser = log.UserID?.toString().includes(searchText);
    const matchAction = log.Action?.toLowerCase().includes(
      searchText.toLowerCase(),
    );

    const matchDate = filterDate
      ? log.CreatedAt &&
        log.CreatedAt.startsWith(filterDate.toISOString().slice(0, 10))
      : true;

    return (matchID || matchUser || matchAction) && matchDate;
  });

  return (
    <View style={styles.container}>
      <View style={styles.main}>
        {/* Top Filters */}
        <View style={styles.topBar}>
          <TextInput
            placeholder="Search by LogID, UserID, Action..."
            value={searchText}
            onChangeText={setSearchText}
            style={styles.search}
          />
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => setShowDatePicker(true)}
          >
            <Text>📅</Text>
          </TouchableOpacity>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={filterDate || new Date()}
            mode="date"
            display="default"
            onChange={(event, date) => {
              setShowDatePicker(false);
              if (date) setFilterDate(date);
            }}
          />
        )}

        {/* Logs Table */}
        <View style={styles.table}>
          <FlatList
            data={filteredLogs}
            keyExtractor={(item) => item.LogID.toString()}
            renderItem={({ item }) => (
              <View style={styles.row}>
                <Text style={styles.cell}>ID: {item.LogID}</Text>
                <Text style={styles.cell}>User: {item.UserID}</Text>
                <Text style={styles.cell}>Action: {item.Action}</Text>
                <Text style={styles.cell}>
                  {new Date(item.CreatedAt).toLocaleString()}
                </Text>

                <TouchableOpacity
                  style={styles.viewBtn}
                  onPress={() => {
                    setSelectedLog(item);
                    setModalVisible(true);
                  }}
                >
                  <Text style={{ color: "#fff" }}>View</Text>
                </TouchableOpacity>
              </View>
            )}
          />
        </View>

        {/* Log Detail Modal */}
        <Modal
          visible={modalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Log Details</Text>
              {selectedLog && (
                <>
                  <Text style={styles.detailText}>
                    LogID: {selectedLog.LogID}
                  </Text>
                  <Text style={styles.detailText}>
                    UserID: {selectedLog.UserID}
                  </Text>
                  <Text style={styles.detailText}>
                    Action: {selectedLog.Action}
                  </Text>
                  <Text style={styles.detailText}>
                    Description: {selectedLog.Description || "N/A"}
                  </Text>
                  <Text style={styles.detailText}>
                    Created At:{" "}
                    {new Date(selectedLog.CreatedAt).toLocaleString()}
                  </Text>
                </>
              )}

              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setModalVisible(false)}
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
const isTablet = screenWidth >= 768;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#EEF3F9",
    padding: 10,
    marginTop: 20,
  },
  main: {
    flex: 1,
    padding: 16,
  },
  topBar: {
    flexDirection: "row",
    marginBottom: 10,
  },
  search: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  iconBtn: {
    marginLeft: 10,
    padding: 14,
    backgroundColor: "#2979FF",
    borderRadius: 10,
  },
  table: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 10,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  cell: {
    fontSize: 16,
    flex: 1,
  },
  viewBtn: {
    backgroundColor: "#2979FF",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  modalContainer: {
    flex: 1,
    maxHeight: "100%",
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
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  detailText: {
    fontSize: 16,
    marginVertical: 4,
  },
  closeBtn: {
    backgroundColor: "#2979FF",
    padding: 12,
    marginTop: 10,
    borderRadius: 8,
    alignItems: "center",
  },
});
