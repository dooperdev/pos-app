// UserList.js
import { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useSQLiteContext } from "expo-sqlite";

const UserList = () => {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const db = useSQLiteContext();

  // Fetch users from the database
  const fetchUsers = async () => {
    try {
      const result = await db.getAllAsync("SELECT id, username FROM users");
      setUsers(result);
    } catch (ex) {
      console.log(ex);
      Alert.alert("Error", "Failed to fetch users.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  if (isLoading) {
    return <ActivityIndicator size="large" color="#0000ff" />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Registered Users</Text>
      {users.length === 0 ? (
        <Text style={styles.noUsers}>No users found.</Text>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View style={styles.userItem}>
              <Text style={styles.username}>{item.username}</Text>
            </View>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: "center" },
  title: { fontSize: 26, textAlign: "center", marginBottom: 20 },
  noUsers: { textAlign: "center", fontSize: 16, color: "#888" },
  userItem: {
    padding: 12,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    marginBottom: 10,
  },
  username: { fontSize: 18 },
});

export default UserList;
