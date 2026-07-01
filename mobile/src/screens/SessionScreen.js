import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Button, FlatList, Alert } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { listenToSession, listenToAttendance } from "../services/db";
import { endSessionFn } from "../services/edgeFunctions";

/**
 * Shows a QR code that updates itself whenever the session doc's `token`
 * field changes server-side (every ~1 minute, see functions/src/index.js
 * rotateTokens). Think of it like a bus ticket that only works for one
 * ride — an old screenshot stops working once a new one is issued.
 */
export default function SessionScreen({ route, navigation }) {
  const { sessionId, courseCode } = route.params;
  const [session, setSession] = useState(null);
  const [attendance, setAttendance] = useState([]);

  useEffect(() => {
    const unsubSession = listenToSession(sessionId, setSession);
    const unsubAttendance = listenToAttendance(sessionId, setAttendance);
    return () => {
      unsubSession();
      unsubAttendance();
    };
  }, [sessionId]);

  const handleEnd = async () => {
    try {
      await endSessionFn({ sessionId });
      navigation.goBack();
    } catch (err) {
      Alert.alert("Could not end session", err.message);
    }
  };

  if (!session) {
    return (
      <View style={styles.center}>
        <Text>Loading session...</Text>
      </View>
    );
  }

  const qrPayload = JSON.stringify({ sessionId, token: session.token });

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>{courseCode} — Live Session</Text>
      <Text style={styles.subtext}>Status: {session.status}</Text>

      <View style={styles.qrBox}>
        <QRCode value={qrPayload} size={220} />
      </View>

      <Text style={styles.fallbackLabel}>Fallback phrase (if camera doesn't work):</Text>
      <Text style={styles.fallbackCode}>{session.token}</Text>

      <Button title="End Session" color="#c0392b" onPress={handleEnd} />

      <Text style={[styles.heading, { marginTop: 24 }]}>
        Checked in: {attendance.length}
      </Text>
      <FlatList
        data={attendance}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.rowName}>{item.studentName}</Text>
            <Text style={styles.rowMeta}>
              {item.regNo} · {item.distanceMeters}m · {item.verifiedBy}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  heading: { fontSize: 18, fontWeight: "bold" },
  subtext: { color: "#666", marginBottom: 12 },
  qrBox: { alignItems: "center", marginVertical: 16 },
  fallbackLabel: { textAlign: "center", color: "#666", fontSize: 12 },
  fallbackCode: { textAlign: "center", fontSize: 24, fontWeight: "bold", letterSpacing: 4, marginBottom: 16 },
  row: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#eee" },
  rowName: { fontSize: 15, fontWeight: "600" },
  rowMeta: { fontSize: 12, color: "#666" },
});
