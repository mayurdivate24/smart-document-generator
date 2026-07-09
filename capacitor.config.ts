import { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.apex.smartdocgenerator",
  appName: "Smart Document Generator",
  webDir: "dist",
  server: {
    // Replace with your actual deployed Vercel Frontend URL
    url: "https://your-frontend-app.vercel.app", 
    cleartext: true
  },
  android: {
    allowMixedContent: true,
    backgroundColor: "#ffffff"
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#ffffff",
      androidScaleType: "CENTER_CROP",
      showSpinner: false
    }
  }
};

export default config;
