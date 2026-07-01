import * as Application from "expo-application";
import { Platform } from "react-native";

/**
 * Returns a stable per-device identifier.
 * - Android: androidId is stable per device+app install.
 * - iOS: iosIdForVendor is stable per device+vendor (resets if all apps
 *   from your vendor are uninstalled — good enough for this use case).
 */
export async function getDeviceId() {
  if (Platform.OS === "android") {
    return Application.androidId || "unknown-android-device";
  }
  const id = await Application.getIosIdForVendorAsync();
  return id || "unknown-ios-device";
}
