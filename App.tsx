import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StatusBar } from "expo-status-bar";
import { Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppProvider } from "./lib/AppContext";
import { DashboardScreen } from "./screens/DashboardScreen";
import { TransactionsScreen } from "./screens/TransactionsScreen";
import { ExplainTabScreen } from "./screens/ExplainTabScreen";
import { ProfileScreen } from "./screens/ProfileScreen";
import { colors } from "./lib/theme";

const Tab = createBottomTabNavigator();

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  return (
    <View style={{ alignItems: "center", justifyContent: "center", width: 40 }}>
      <Text style={{ fontSize: 18 }}>{label}</Text>
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppProvider>
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
                tabBarIcon: ({ focused }) => <TabIcon label="🏠" focused={focused} />,
              }}
            />
            <Tab.Screen
              name="Transactions"
              component={TransactionsScreen}
              options={{
                tabBarLabel: "Opérations",
                tabBarIcon: ({ focused }) => <TabIcon label="📝" focused={focused} />,
              }}
            />
            <Tab.Screen
              name="Expliquer"
              component={ExplainTabScreen}
              options={{
                tabBarLabel: "Expliquer",
                tabBarIcon: ({ focused }) => <TabIcon label="💡" focused={focused} />,
              }}
            />
            <Tab.Screen
              name="Profil"
              component={ProfileScreen}
              options={{
                tabBarLabel: "Profil",
                tabBarIcon: ({ focused }) => <TabIcon label="👤" focused={focused} />,
              }}
            />
          </Tab.Navigator>
        </NavigationContainer>
        <StatusBar style="dark" />
      </AppProvider>
    </SafeAreaProvider>
  );
}