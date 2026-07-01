import * as Location from "expo-location";

/**
 * Asks for foreground location permission only (never background), and
 * only at the moment it's actually needed (when the lecturer starts a
 * session, or the student starts scanning). We never call
 * watchPositionAsync — just a single high-accuracy fix per action — so
 * the OS doesn't show a "this app is tracking you" indicator outside
 * those moments.
 */
export async function getCurrentHighAccuracyLocation() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") {
    throw new Error("Location permission is required to mark or start attendance.");
  }

  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.BestForNavigation,
  });

  return {
    lat: position.coords.latitude,
    lng: position.coords.longitude,
    accuracy: position.coords.accuracy,
  };
}
