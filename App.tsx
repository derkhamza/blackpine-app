import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppProvider, useApp } from "./lib/AppContext";
import { DashboardScreen } from "./screens/DashboardScreen";
import { TransactionsScreen } from "./screens/TransactionsScreen";
import { ExplainTabScreen } from "./screens/ExplainTabScreen";
import { ProfileScreen } from "./screens/ProfileScreen";
import { OnboardingFlow } from "./screens/onboarding/OnboardingFlow";
import { colors } from "./lib/theme";

const Tab = createBottomTabNavigator();

function TabIcon({ label }: { label: string }) {
  return (
    <View style={{ alignItems: "center", justifyContent: "center", width: 40 }}>
      <Text style={{ fontSize: 18 }}>{label}</Text>
    </View>
  );
}

function RootRouter() {
  const { loading, onboarded } = useApp();

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
          tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        }}
      >
        <Tab.Screen
          name="Dashboard"
          component={DashboardScreen}
          options={{
            tabBarLabel: "Accueil",
            tabBarIcon: () => <TabIcon label="🏠" />,
          }}
        />
        <Tab.Screen
          name="Transactions"
          component={TransactionsScreen}
          options={{
            tabBarLabel: "Opérations",
            tabBarIcon: () => <TabIcon label="📝" />,
          }}
        />
        <Tab.Screen
          name="Expliquer"
          component={ExplainTabScreen}
          options={{
            tabBarLabel: "Expliquer",
            tabBarIcon: () => <TabIcon label="💡" />,
          }}
        />
        <Tab.Screen
          name="Profil"
          component={ProfileScreen}
          options={{
            tabBarLabel: "Profil",
            tabBarIcon: () => <TabIcon label="👤" />,
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <RootRouter />
        <StatusBar style="dark" />
      </AppProvider>
    </SafeAreaProvider>
  );
}