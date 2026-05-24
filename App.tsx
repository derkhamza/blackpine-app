import { useEffect, useMemo, useRef, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator, BottomTabBar } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, AppState, Pressable, Platform, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { AppProvider, useApp } from "./lib/AppContext";
import { CabinetProvider, useCabinet } from "./lib/CabinetContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { SubscriptionModal } from "./components/SubscriptionModal";
import { WebNavBar } from "./components/WebNavBar";
import { WebAppShell } from "./components/WebAppShell";
import { BiometricLock } from "./components/BiometricLock";
import { HomeScreen } from "./screens/HomeScreen";
import { SecretaryApp } from "./screens/SecretaryApp";
import { FinancesScreen } from "./screens/FinancesScreen";
import { ExplainTabScreen } from "./screens/ExplainTabScreen";
import { AgendaScreen } from "./screens/AgendaScreen";
import { PatientsScreen } from "./screens/PatientsScreen";
import { ProfileScreen } from "./screens/ProfileScreen";
import { PayrollScreen } from "./screens/PayrollScreen";
import { AppointmentDetailScreen } from "./screens/AppointmentDetailScreen";
import { PatientDetailScreen } from "./screens/PatientDetailScreen";
import { OnboardingFlow } from "./screens/onboarding/OnboardingFlow";
import { AuthGate } from "./screens/AuthGate";
import { Icon } from "./lib/icons";
import { useT } from "./lib/useT";
import { loadSavedLanguage } from "./lib/i18n";
import { applyRTL } from "./lib/rtl";
import {
  requestNotificationPermissions,
  scheduleAcompteNotifications,
} from "./lib/notifications";
import { radii, spacing } from "./lib/theme";
import { ThemeProvider, useColors, useTheme } from "./lib/ThemeContext";
import { DarkTheme, DefaultTheme } from "@react-navigation/native";
import { PaywallScreen } from "./screens/PaywallScreen";
import { StatsScreen } from "./screens/StatsScreen";
import { WEB_BREAKPOINT } from "./lib/webConstants";

const Tab = createBottomTabNavigator();
const AgendaStack = createNativeStackNavigator();
const PatientsStack = createNativeStackNavigator();
const ProfileStack = createNativeStackNavigator();
const FinancesStack = createNativeStackNavigator();

function AgendaStackScreen() {
  return (
    <AgendaStack.Navigator screenOptions={{ headerShown: false }}>
      <AgendaStack.Screen name="AgendaList" component={AgendaScreen} />
      <AgendaStack.Screen name="AppointmentDetail" component={AppointmentDetailScreen} />
    </AgendaStack.Navigator>
  );
}

function PatientsStackScreen() {
  return (
    <PatientsStack.Navigator screenOptions={{ headerShown: false }}>
      <PatientsStack.Screen name="PatientsList" component={PatientsScreen} />
      <PatientsStack.Screen name="PatientDetail" component={PatientDetailScreen} />
    </PatientsStack.Navigator>
  );
}

function ProfileStackScreen() {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="ProfileMain" component={ProfileScreen} />
      <ProfileStack.Screen name="Payroll" component={PayrollScreen} />
      <ProfileStack.Screen name="Stats" component={StatsScreen} />
    </ProfileStack.Navigator>
  );
}

function FinancesStackScreen() {
  return (
    <FinancesStack.Navigator screenOptions={{ headerShown: false }}>
      <FinancesStack.Screen name="FinancesMain" component={FinancesScreen} />
      <FinancesStack.Screen name="Expliquer" component={ExplainTabScreen} />
    </FinancesStack.Navigator>
  );
}

/** Lock after 2 minutes in the background. */
const AUTO_LOCK_MS = 2 * 60 * 1000;

const makeLoadingStyles = (c: ReturnType<typeof useColors>) => StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: c.surfaceDark },
  logoMark: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: "rgba(255,255,255,0.10)",
    alignItems: "center", justifyContent: "center",
    marginBottom: spacing.lg,
    borderWidth: 1.5, borderColor: "rgba(255,255,255,0.18)",
  },
  brand: { fontSize: 20, fontWeight: "800", letterSpacing: 5, color: "rgba(255,255,255,0.95)" },
  brandSub: { fontSize: 10, letterSpacing: 5, color: c.gold, marginTop: 4, fontWeight: "600" },
});

const makeTabStyles = (c: ReturnType<typeof useColors>) => StyleSheet.create({
  trialStrip: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 5, backgroundColor: c.warningSoft,
    borderTopWidth: 1, borderTopColor: c.warning + "44",
    paddingHorizontal: spacing.lg, paddingVertical: 6,
  },
  trialStripUrgent: { backgroundColor: c.dangerSoft, borderTopColor: c.danger + "44" },
  trialStripText: { fontSize: 12, fontWeight: "600", color: c.warning, flexShrink: 1 },
});

function RootRouter() {
  const { screen, isActive, trialDaysLeft, biometricEnabled, result, fiscalYear } = useApp();
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const [langLoaded, setLangLoaded] = useState(false);
  const [subModalOpen, setSubModalOpen] = useState(false);
  const { width } = useWindowDimensions();
  const isWebWide = Platform.OS === "web" && width >= WEB_BREAKPOINT;
  const colors = useColors();
  const { isDark } = useTheme();
  const loadingStyles = makeLoadingStyles(colors);
  const tabStyles = makeTabStyles(colors);

  // Biometric lock — only active in the main app, not on web
  const [isLocked, setIsLocked] = useState(false);
  const backgroundedAt = useRef<number>(0);

  useEffect(() => {
    if (Platform.OS === "web") return;
    const sub = AppState.addEventListener("change", (nextState) => {
      if (nextState === "background" || nextState === "inactive") {
        backgroundedAt.current = Date.now();
      } else if (nextState === "active") {
        if (
          biometricEnabled &&
          screen === "app" &&
          isActive &&
          backgroundedAt.current > 0 &&
          Date.now() - backgroundedAt.current > AUTO_LOCK_MS
        ) {
          setIsLocked(true);
        }
        backgroundedAt.current = 0;
      }
    });
    return () => sub.remove();
  }, [biometricEnabled, screen, isActive]);

  // ── Push notifications: tax deadline reminders ────────────────────────────
  // Request permissions once when the main app becomes active, then schedule
  // (or reschedule) acompte reminders whenever the fiscal year or tax changes.
  const taxDue = result?.tax?.taxDue ?? 0;
  useEffect(() => {
    if (Platform.OS === "web") return;
    if (screen !== "app" || !isActive) return;
    requestNotificationPermissions().then((granted) => {
      if (granted && taxDue > 0) {
        scheduleAcompteNotifications(fiscalYear, taxDue);
      }
    });
  }, [screen, isActive, fiscalYear, taxDue]);

  // Unbilled appointment badge — completed appts in the last 60 days with no billedAt
  const { appointments: cabinetAppts } = useCabinet();
  const unbilledCount = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 60);
    const cutoffIso = cutoff.toISOString().slice(0, 10);
    return cabinetAppts.filter(
      a => a.status === "completed" && !a.billedAt && a.date >= cutoffIso
    ).length;
  }, [cabinetAppts]);

  // Pending CNOPS / AMO reimbursements badge
  const pendingReimbCount = useMemo(
    () => cabinetAppts.filter(a => a.reimbursementStatus === "pending").length,
    [cabinetAppts],
  );

  useEffect(() => {
    loadSavedLanguage().then(() => {
      applyRTL();
      setLangLoaded(true);
    });
  }, []);

  const screenOptions = {
    headerShown: false,
    tabBarActiveTintColor: colors.brand,
    tabBarInactiveTintColor: colors.textTertiary,
    tabBarStyle: {
      backgroundColor: colors.surface,
      borderTopColor: colors.border,
      borderTopWidth: 1,
      paddingTop: 8,
      paddingBottom: insets.bottom + 8,
      height: 56 + insets.bottom + 8,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.06,
      shadowRadius: 16,
      elevation: 12,
    },
    tabBarLabelStyle: { fontSize: 10, fontWeight: "700" as const, marginTop: 1, letterSpacing: 0.2 },
    tabBarIconStyle: { marginBottom: -2 },
  };

  if (!langLoaded || screen === "loading") {
    return (
      <View style={loadingStyles.container}>
        <View style={loadingStyles.logoMark}>
          <Icon name="stethoscope" size={28} color={colors.textOnDark} />
        </View>
        <Text style={loadingStyles.brand}>BLACKPINE</Text>
        <Text style={loadingStyles.brandSub}>CABINET</Text>
        <ActivityIndicator
          size="small"
          color="rgba(255,255,255,0.45)"
          style={{ marginTop: spacing.xxl }}
        />
      </View>
    );
  }

  if (screen === "auth") return <AuthGate />;
  if (screen === "secretary") return <SecretaryApp />;
  if (screen === "onboarding") return <OnboardingFlow />;
  if (!isActive) return <PaywallScreen />;

  const navTheme = isDark
    ? { ...DarkTheme, colors: { ...DarkTheme.colors, background: colors.bg, card: colors.surface, border: colors.border, text: colors.textPrimary } }
    : { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: colors.bg, card: colors.surface, border: colors.border, text: colors.textPrimary } };

  const navigator = (
    <NavigationContainer theme={navTheme}>
      <Tab.Navigator
        screenOptions={screenOptions}
        tabBar={(props) => (
          <>
            {trialDaysLeft > 0 && !isWebWide && (
              <Pressable
                style={[tabStyles.trialStrip, trialDaysLeft <= 7 && tabStyles.trialStripUrgent]}
                onPress={() => setSubModalOpen(true)}
              >
                <Icon name="clock" size={12} color={trialDaysLeft <= 7 ? colors.danger : colors.warning} />
                <Text
                  style={[tabStyles.trialStripText, trialDaysLeft <= 7 && { color: colors.danger }]}
                  numberOfLines={1}
                >
                  {t("paywall.trialBanner")} · {trialDaysLeft} {t("paywall.trialDaysLeft")} · {t("paywall.tapToSubscribe")} ›
                </Text>
              </Pressable>
            )}
            {isWebWide ? <WebNavBar {...props} /> : <BottomTabBar {...props} />}
          </>
        )}
      >
        <Tab.Screen
          name="Accueil"
          component={HomeScreen}
          options={{
            tabBarLabel: t("tabs.home"),
            tabBarIcon: ({ color, size }) => <Icon name="stethoscope" size={size} color={color} />,
          }}
        />
        <Tab.Screen
          name="Agenda"
          component={AgendaStackScreen}
          options={{
            tabBarLabel: t("tabs.agenda"),
            tabBarIcon: ({ color, size }) => <Icon name="calendar" size={size} color={color} />,
            tabBarBadge: unbilledCount > 0 ? (unbilledCount > 9 ? "9+" : unbilledCount) : undefined,
            tabBarBadgeStyle: { backgroundColor: colors.warning, fontSize: 10, minWidth: 16, height: 16, lineHeight: 16 },
          }}
        />
        <Tab.Screen
          name="Patients"
          component={PatientsStackScreen}
          options={{ tabBarLabel: t("tabs.patients"), tabBarIcon: ({ color, size }) => <Icon name="users" size={size} color={color} /> }}
        />
        <Tab.Screen
          name="Finances"
          component={FinancesStackScreen}
          options={{
            tabBarLabel: t("tabs.finances"),
            tabBarIcon: ({ color, size }) => <Icon name="barChart" size={size} color={color} />,
            tabBarBadge: pendingReimbCount > 0 ? (pendingReimbCount > 9 ? "9+" : pendingReimbCount) : undefined,
            tabBarBadgeStyle: { backgroundColor: "#6b46c1", fontSize: 10, minWidth: 16, height: 16, lineHeight: 16 },
          }}
        />
        <Tab.Screen
          name="Profil"
          component={ProfileStackScreen}
          options={{ tabBarLabel: t("tabs.profile"), tabBarIcon: ({ color, size }) => <Icon name="profile" size={size} color={color} /> }}
          listeners={({ navigation }) => ({
            // Always reset to ProfileMain when the tab button is pressed.
            // Without this, navigating to Stats from another tab (e.g. HomeScreen's
            // "Votre cabinet en chiffres" card) would leave the Profil stack showing
            // Stats the next time the user taps the tab icon.
            tabPress: (e) => {
              e.preventDefault();
              navigation.navigate("Profil", { screen: "ProfileMain" });
            },
          })}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );

  if (isWebWide) {
    return (
      <>
        <WebAppShell>{navigator}</WebAppShell>
        <SubscriptionModal visible={subModalOpen} onClose={() => setSubModalOpen(false)} />
      </>
    );
  }
  return (
    <>
      {navigator}
      <SubscriptionModal visible={subModalOpen} onClose={() => setSubModalOpen(false)} />
      {isLocked && <BiometricLock onUnlock={() => setIsLocked(false)} />}
    </>
  );
}


function ThemedApp() {
  const { isDark } = useTheme();
  return (
    <ErrorBoundary>
      <AppProvider>
        <CabinetProvider>
          <RootRouter />
          <StatusBar style={isDark ? "light" : "dark"} backgroundColor="transparent" translucent />
        </CabinetProvider>
      </AppProvider>
    </ErrorBoundary>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ThemedApp />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
