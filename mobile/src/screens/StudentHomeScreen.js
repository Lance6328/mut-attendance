import React from "react";
import { View, Text, StyleSheet, Button } from "react-native";
import { useAuth } from "../context/AuthContext";

export default function StudentHomeScreen({ navigation }) {
  const { profile } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Hello, {profile?.fullName || "Student"}</Text>
      <Text style={styles.sub}>Reg No: {profile?.regNo}</Text>

      <View style={{ marginTop: 32 }}>
        <Button title="Scan Attendance" onPress={() => navigation.navigate("Scan")} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  heading: { fontSize: 20, fontWeight: "bold" },
  sub: { color: "#666", marginTop: 4 },
});
