import "./lib/i18n";
import i18n from "i18next";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppProvider, useApp } from "./lib/AppContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { DashboardScreen } from "./screens/DashboardScreen";
import { TransactionsScreen } from "./screens/TransactionsScreen";
import { ExplainTabScreen } from "./screens/ExplainTabScreen";
import { ProfileScreen } from "./screens/ProfileScreen";
import { OnboardingFlow } from "./screens/onboarding/OnboardingFlow";
import { Icon } from "./lib/icons";
import { colors } from "./lib/theme";
import { loadSavedLanguage } from "./lib/i18n";
import { applyRTL } from "./lib/rtl";
import fr from "./lib/i18n/fr";
import ar from "./lib/i18n/ar";
import { useEffect, useState } from "react";

const Tab = createBottomTabNavigator();

function RootRouter() {
  const { loading, onboarded } = useApp();
  const currentLang = (i18n.language || "fr") as AppLanguage;
  const strings = currentLang === "ar" ? ar : fr;
  const t = (key: string): string => {
    const keys = key.split(".");
    let result: any = strings;
    for (const k of keys) {
      result = result?.[k];
    }
    return (result as string) ?? key;
  };

  const [langLoaded, setLangLoaded] = useState(false);

  useEffect(() => {
    loadSavedLanguage().then(() => {
      applyRTL();
      setLangLoaded(true);
    });
  }, []);

  if (loading || !langLoaded) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }
  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  if (!onboarded) {
    return <OnboardingFlow />;
  }

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.brand,
          tabBarInactiveTintColor: colors.textTertiary,
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            paddingTop: 6,
            paddingBottom: 6,
            height: 62,
          },
          tabBarLabelStyle: { fontSize: 11, fontWeight: "600", marginTop: -2 },
        }}
      >
        <Tab.Screen
          name="Dashboard"
          component={DashboardScreen}
          options={{
            tabBarLabel: t("tabs.home"),
            tabBarIcon: ({ color, size }) => <Icon name="dashboard" size={size} color={color} />,
          }}
        />
        <Tab.Screen
          name="Transactions"
          component={TransactionsScreen}
          options={{
            tabBarLabel: t("tabs.transactions"),
            tabBarIcon: ({ color, size }) => <Icon name="transactions" size={size} color={color} />,
          }}
        />
        <Tab.Screen
          name="Expliquer"
          component={ExplainTabScreen}
          options={{
            tabBarLabel: t("tabs.explain"),
            tabBarIcon: ({ color, size }) => <Icon name="explain" size={size} color={color} />,
          }}
        />
        <Tab.Screen
          name="Profil"
          component={ProfileScreen}
          options={{
            tabBarLabel: t("tabs.profile"),
            tabBarIcon: ({ color, size }) => <Icon name="profile" size={size} color={color} />,
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <AppProvider>
          <RootRouter />
          <StatusBar style="dark" />
        </AppProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}