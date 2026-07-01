import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, Button, Alert, ActivityIndicator } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { getCurrentHighAccuracyLocation } from "../utils/permissions";
import { getDeviceId } from "../services/deviceId";
import { markAttendanceFn } from "../services/edgeFunctions";

/**
 * Student scans the lecturer's QR code. The QR payload is a small JSON
 * string like {"sessionId":"abc123","token":"7F3K9Q"}. If the camera is
 * denied or unavailable, the student can type the same info in manually
 * using the fallback phrase the lecturer reads out.
 */
export default function ScanScreen({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [busy, setBusy] = useState(false);
  const [manualSessionId, setManualSessionId] = useState("");
  const [manualToken, setManualToken] = useState("");

  const handleBarcodeScanned = ({ data }) => {
    if (scanned || busy) return;
    setScanned(true);
    try {
      const parsed = JSON.parse(data);
      submitAttendance(parsed.sessionId, parsed.token);
    } catch (e) {
      Alert.alert("Unrecognized QR code", "Please try the fallback phrase instead.");
      setScanned(false);
    }
  };

  const submitAttendance = async (sessionId, token) => {
    setBusy(true);
    try {
      const { lat, lng, accuracy } = await getCurrentHighAccuracyLocation();
      const deviceId = await getDeviceId();

      const result = await markAttendanceFn({ sessionId, token, lat, lng, accuracy, deviceId });

      if (result.alreadyMarked) {
        Alert.alert("Already marked", "You already checked in for this session.");
      } else {
        Alert.alert("Success", `Attendance marked! You were ${result.distanceMeters}m away.`);
      }
      navigation.goBack();
    } catch (err) {
      // err.message comes straight from the Cloud Function's HttpsError message
      Alert.alert("Could not mark attendance", err.message);
      setScanned(false);
    } finally {
      setBusy(false);
    }
  };

  const handleManualSubmit = () => {
    if (!manualSessionId || !manualToken) {
      Alert.alert("Missing info", "Enter both the session ID and the code.");
      return;
    }
    submitAttendance(manualSessionId.trim(), manualToken.trim().toUpperCase());
  };

  if (!permission) {
    return <ActivityIndicator style={{ flex: 1 }} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={{ marginBottom: 12 }}>We need camera access to scan the QR code.</Text>
        <Button title="Grant Camera Permission" onPress={requestPermission} />
        <ManualFallback
          manualSessionId={manualSessionId}
          setManualSessionId={setManualSessionId}
          manualToken={manualToken}
          setManualToken={setManualToken}
          onSubmit={handleManualSubmit}
          busy={busy}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <CameraView
        style={{ flex: 1 }}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
      />
      {busy && (
        <View style={styles.overlay}>
          <ActivityIndicator color="#fff" size="large" />
          <Text style={{ color: "#fff", marginTop: 8 }}>Verifying your location...</Text>
        </View>
      )}
      <View style={styles.manualBox}>
        <ManualFallback
          manualSessionId={manualSessionId}
          setManualSessionId={setManualSessionId}
          manualToken={manualToken}
          setManualToken={setManualToken}
          onSubmit={handleManualSubmit}
          busy={busy}
        />
      </View>
    </View>
  );
}

function ManualFallback({ manualSessionId, setManualSessionId, manualToken, setManualToken, onSubmit, busy }) {
  return (
    <View style={{ width: "100%" }}>
      <Text style={styles.label}>Or type the code the lecturer reads out:</Text>
      <TextInput
        style={styles.input}
        placeholder="Session ID"
        value={manualSessionId}
        onChangeText={setManualSessionId}
      />
      <TextInput
        style={styles.input}
        placeholder="Code (e.g. 7F3K9Q)"
        autoCapitalize="characters"
        value={manualToken}
        onChangeText={setManualToken}
      />
      <Button title={busy ? "Submitting..." : "Submit"} onPress={onSubmit} disabled={busy} />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 16 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  manualBox: { backgroundColor: "#fff", padding: 16 },
  label: { marginBottom: 6, color: "#444" },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 10, marginBottom: 8 },
});
