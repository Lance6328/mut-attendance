import React, { useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { useAuth } from "../context/AuthContext";
import { getCurrentHighAccuracyLocation } from "../utils/permissions";
import { startSessionFn } from "../services/edgeFunctions";

export default function LecturerHomeScreen({ navigation }) {
  const { profile } = useAuth();
  const [busy, setBusy] = useState(false);
  const courses = profile?.courses || [];

  const handleStart = async (courseCode) => {
    setBusy(true);
    try {
      const { lat, lng, accuracy } = await getCurrentHighAccuracyLocation();
      const result = await startSessionFn({
        courseCode,
        courseName: courseCode, // swap for a real course name lookup if you store one
        lat,
        lng,
        accuracy,
        durationMinutes: 45,
      });
      navigation.navigate("Session", { sessionId: result.sessionId, courseCode });
    } catch (err) {
      Alert.alert("Could not start session", err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Your Units</Text>
      {busy && <ActivityIndicator style={{ marginVertical: 16 }} />}
      <FlatList
        data={courses}
        keyExtractor={(item) => item}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => handleStart(item)} disabled={busy}>
            <Text style={styles.cardText}>{item}</Text>
            <Text style={styles.cardSub}>Tap to start attendance session</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  heading: { fontSize: 20, fontWeight: "bold", marginBottom: 12 },
  card: { backgroundColor: "#f1f3f5", padding: 16, borderRadius: 10, marginBottom: 10 },
  cardText: { fontSize: 16, fontWeight: "600" },
  cardSub: { fontSize: 12, color: "#666", marginTop: 4 },
});
