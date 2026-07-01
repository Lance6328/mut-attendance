import React from "react";
import { ActivityIndicator, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { AuthProvider, useAuth } from "./src/context/AuthContext";

import LoginScreen from "./src/screens/LoginScreen";
import LecturerHomeScreen from "./src/screens/LecturerHomeScreen";
import SessionScreen from "./src/screens/SessionScreen";
import StudentHomeScreen from "./src/screens/StudentHomeScreen";
import ScanScreen from "./src/screens/ScanScreen";

const Stack = createNativeStackNavigator();

function RootNavigator() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!user || !profile) {
    return (
      <Stack.Navigator>
        <Stack.Screen name="Login" component={LoginScreen} options={{ title: "Sign In" }} />
      </Stack.Navigator>
    );
  }

  if (profile.role === "lecturer") {
    return (
      <Stack.Navigator>
        <Stack.Screen name="LecturerHome" component={LecturerHomeScreen} options={{ title: "My Units" }} />
        <Stack.Screen name="Session" component={SessionScreen} options={{ title: "Attendance Session" }} />
      </Stack.Navigator>
    );
  }

  // student
  return (
    <Stack.Navigator>
      <Stack.Screen name="StudentHome" component={StudentHomeScreen} options={{ title: "Home" }} />
      <Stack.Screen name="Scan" component={ScanScreen} options={{ title: "Scan Attendance" }} />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}
