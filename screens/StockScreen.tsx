/**
 * StockScreen — practice inventory (stock) + suppliers (fournisseurs).
 *
 * Stock items track quantity, low-stock threshold and expiry (péremption);
 * suppliers hold contact + what they supply. Both persist per-user via
 * CabinetContext (local AsyncStorage), mirroring the web app's Stock pages.
 */
import React, { useMemo, useState } from "react";
import {
  Linking, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from "react-native";
import { SafeScreen } from "../components/SafeScreen";
import { useCabinet } from "../lib/CabinetContext";
import { useColors } from "../lib/ThemeContext";
import { useT } from "../lib/useT";
import { Icon, IconName } from "../lib/icons";
import { radii, shadows, spacing, typography, ColorPalette } from "../lib/theme";
import { uuid } from "../lib/utils";
import {
  StockItem, Supplier, StockCategory,
  STOCK_CATEGORY_LABELS, STOCK_CATEGORY_COLORS, expiryStatus,
  PurchaseOrder, PurchaseOrderLine, PurchaseOrderStatus,
  PO_STATUS_LABELS, PO_STATUS_COLORS,
} from "../lib/cabinetTypes";

const CATEGORIES: StockCategory[] = ["medicament", "consommable", "equipement", "autre"];
const PO_STATUSES: PurchaseOrderStatus[] = ["draft", "ordered", "partial", "received", "cancelled"];
const poTotal = (po: PurchaseOrder) => po.lines.reduce((s, l) => s + l.quantity * (l.unitPrice ?? 0), 0);

export function StockScreen({ navigation }: { navigation?: any }) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useT();
  const {
    stockItems, addStockItem, updateStockItem, deleteStockItem,
    suppliers, addSupplier, updateSupplier, deleteSupplier,
    purchaseOrders, addPurchaseOrder, updatePurchaseOrder, deletePurchaseOrder,
  } = useCabinet();

  const [tab, setTab] = useState<"stock" | "suppliers" | "po">("stock");
  const [stockModal, setStockModal] = useState<{ item?: StockItem } | null>(null);
  const [supModal, setSupModal]     = useState<{ sup?: Supplier } | null>(null);
  const [poModal, setPoModal]       = useState<{ po?: PurchaseOrder } | null>(null);

  const sortedPOs = useMemo(
    () => [...purchaseOrders].sort((a, b) => (b.orderedAt || b.createdAt || "").localeCompare(a.orderedAt || a.createdAt || "")),
    [purchaseOrders],
  );

  const today = new Date();

  const sortedStock = useMemo(
    () => [...stockItems].sort((a, b) => a.name.localeCompare(b.name)),
    [stockItems],
  );
  const lowCount = useMemo(
    () => stockItems.filter((s) => s.quantity <= s.minThreshold).length,
    [stockItems],
  );
  const expiringCount = useMemo(
    () => stockItems.filter((s) => {
      const st = expiryStatus(s.expiryDate, today);
      return st === "expired" || st === "soon";
    }).length,
    [stockItems],
  );
  const sortedSuppliers = useMemo(
    () => [...suppliers].sort((a, b) => a.name.localeCompare(b.name)),
    [suppliers],
  );

  const adjust = (item: StockItem, delta: number) =>
    updateStockItem({ ...item, quantity: Math.max(0, item.quantity + delta), updatedAt: new Date().toISOString() });

  return (
    <SafeScreen>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => navigation?.goBack()} hitSlop={8}>
          <Icon name="back" size={20} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>{t("stock.title")}</Text>
        <Pressable style={styles.addBtn} onPress={() => (tab === "stock" ? setStockModal({}) : tab === "suppliers" ? setSupModal({}) : setPoModal({}))}>
          <Icon name="add" size={18} color={colors.textOnDark} />
        </Pressable>
      </View>

      {/* Segments */}
      <View style={styles.tabs}>
        <Pressable style={[styles.tab, tab === "stock" && styles.tabActive]} onPress={() => setTab("stock")}>
          <Text style={[styles.tabText, tab === "stock" && styles.tabTextActive]}>
            {t("stock.tabStock")} {stockItems.length > 0 ? `(${stockItems.length})` : ""}
          </Text>
        </Pressable>
        <Pressable style={[styles.tab, tab === "suppliers" && styles.tabActive]} onPress={() => setTab("suppliers")}>
          <Text style={[styles.tabText, tab === "suppliers" && styles.tabTextActive]}>
            {t("stock.tabSuppliers")} {suppliers.length > 0 ? `(${suppliers.length})` : ""}
          </Text>
        </Pressable>
        <Pressable style={[styles.tab, tab === "po" && styles.tabActive]} onPress={() => setTab("po")}>
          <Text style={[styles.tabText, tab === "po" && styles.tabTextActive]}>
            {t("stock.tabOrders")} {purchaseOrders.length > 0 ? `(${purchaseOrders.length})` : ""}
          </Text>
        </Pressable>
      </View>

      {tab === "stock" ? (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {(lowCount > 0 || expiringCount > 0) && (
            <View style={styles.alertRow}>
              {lowCount > 0 && (
                <View style={[styles.alertChip, { backgroundColor: colors.warning + "22" }]}>
                  <Icon name="alertTriangle" size={13} color={colors.warning} />
                  <Text style={[styles.alertText, { color: colors.warning }]}>{lowCount} · {t("stock.lowAlert")}</Text>
                </View>
              )}
              {expiringCount > 0 && (
                <View style={[styles.alertChip, { backgroundColor: colors.danger + "22" }]}>
                  <Icon name="alertTriangle" size={13} color={colors.danger} />
                  <Text style={[styles.alertText, { color: colors.danger }]}>{expiringCount} · {t("stock.expiryAlert")}</Text>
                </View>
              )}
            </View>
          )}

          {sortedStock.length === 0 ? (
            <Empty icon="pill" text={t("stock.emptyStock")} styles={styles} colors={colors} />
          ) : (
            sortedStock.map((item) => {
              const low = item.quantity <= item.minThreshold;
              const est = expiryStatus(item.expiryDate, today);
              const catColor = STOCK_CATEGORY_COLORS[item.category];
              return (
                <Pressable key={item.id} style={styles.card} onPress={() => setStockModal({ item })}>
                  <View style={[styles.catBar, { backgroundColor: catColor }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardName}>{item.name}</Text>
                    <View style={styles.tagRow}>
                      <View style={[styles.tag, { backgroundColor: catColor + "22" }]}>
                        <Text style={[styles.tagText, { color: catColor }]}>{STOCK_CATEGORY_LABELS[item.category]}</Text>
                      </View>
                      {low && (
                        <View style={[styles.tag, { backgroundColor: colors.warning + "22" }]}>
                          <Text style={[styles.tagText, { color: colors.warning }]}>{t("stock.low")}</Text>
                        </View>
                      )}
                      {est === "expired" && (
                        <View style={[styles.tag, { backgroundColor: colors.danger + "22" }]}>
                          <Text style={[styles.tagText, { color: colors.danger }]}>{t("stock.expired")}</Text>
                        </View>
                      )}
                      {est === "soon" && (
                        <View style={[styles.tag, { backgroundColor: colors.danger + "18" }]}>
                          <Text style={[styles.tagText, { color: colors.danger }]}>{t("stock.expSoon")} {item.expiryDate}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <View style={styles.qtyBox}>
                    <Pressable style={styles.qtyBtn} onPress={() => adjust(item, -1)} hitSlop={6}>
                      <Text style={styles.qtyBtnText}>−</Text>
                    </Pressable>
                    <View style={styles.qtyMid}>
                      <Text style={[styles.qtyVal, low && { color: colors.warning }]}>{item.quantity}</Text>
                      <Text style={styles.qtyUnit}>{item.unit}</Text>
                    </View>
                    <Pressable style={styles.qtyBtn} onPress={() => adjust(item, +1)} hitSlop={6}>
                      <Text style={styles.qtyBtnText}>+</Text>
                    </Pressable>
                  </View>
                </Pressable>
              );
            })
          )}
          <View style={{ height: spacing.xxl }} />
        </ScrollView>
      ) : tab === "suppliers" ? (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {sortedSuppliers.length === 0 ? (
            <Empty icon="users" text={t("stock.emptySuppliers")} styles={styles} colors={colors} />
          ) : (
            sortedSuppliers.map((sup) => (
              <Pressable key={sup.id} style={styles.card} onPress={() => setSupModal({ sup })}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardName}>{sup.name}</Text>
                  {!!sup.products && <Text style={styles.cardSub}>{sup.products}</Text>}
                  {!!sup.phone && <Text style={styles.cardSub}>{sup.phone}</Text>}
                </View>
                {!!sup.phone && (
                  <Pressable style={styles.callBtn} onPress={() => Linking.openURL(`tel:${sup.phone}`)} hitSlop={8}>
                    <Icon name="phone" size={15} color={colors.brand} />
                  </Pressable>
                )}
              </Pressable>
            ))
          )}
          <View style={{ height: spacing.xxl }} />
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {sortedPOs.length === 0 ? (
            <Empty icon="clipboard" text={t("stock.emptyOrders")} styles={styles} colors={colors} />
          ) : (
            sortedPOs.map((po) => {
              const st = PO_STATUS_COLORS[po.status];
              const units = po.lines.reduce((s, l) => s + l.quantity, 0);
              return (
                <Pressable key={po.id} style={styles.card} onPress={() => setPoModal({ po })}>
                  <View style={[styles.catBar, { backgroundColor: st }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardName}>{po.supplierName || t("stock.poNoSupplier")}</Text>
                    <Text style={styles.cardSub}>
                      {po.lines.length} {t("stock.poLines")} · {units} {t("stock.poUnits")}{po.orderedAt ? ` · ${po.orderedAt}` : ""}
                    </Text>
                    <View style={styles.tagRow}>
                      <View style={[styles.tag, { backgroundColor: st + "22" }]}>
                        <Text style={[styles.tagText, { color: st }]}>{PO_STATUS_LABELS[po.status]}</Text>
                      </View>
                    </View>
                  </View>
                  <Text style={styles.poTotal}>{poTotal(po).toLocaleString("fr-FR")} MAD</Text>
                </Pressable>
              );
            })
          )}
          <View style={{ height: spacing.xxl }} />
        </ScrollView>
      )}

      {poModal && (
        <PurchaseOrderModal
          initial={poModal.po}
          suppliers={suppliers}
          stockItems={stockItems}
          onSave={(p) => { poModal.po ? updatePurchaseOrder(p) : addPurchaseOrder(p); setPoModal(null); }}
          onDelete={poModal.po ? () => { deletePurchaseOrder(poModal.po!.id); setPoModal(null); } : undefined}
          onClose={() => setPoModal(null)}
          t={t}
        />
      )}
      {stockModal && (
        <StockItemModal
          initial={stockModal.item}
          suppliers={suppliers}
          onSave={(it) => { stockModal.item ? updateStockItem(it) : addStockItem(it); setStockModal(null); }}
          onDelete={stockModal.item ? () => { deleteStockItem(stockModal.item!.id); setStockModal(null); } : undefined}
          onClose={() => setStockModal(null)}
          t={t}
        />
      )}
      {supModal && (
        <SupplierModal
          initial={supModal.sup}
          onSave={(s) => { supModal.sup ? updateSupplier(s) : addSupplier(s); setSupModal(null); }}
          onDelete={supModal.sup ? () => { deleteSupplier(supModal.sup!.id); setSupModal(null); } : undefined}
          onClose={() => setSupModal(null)}
          t={t}
        />
      )}
    </SafeScreen>
  );
}

function Empty({ icon, text, styles, colors }: { icon: IconName; text: string; styles: any; colors: ColorPalette }) {
  return (
    <View style={styles.empty}>
      <Icon name={icon} size={30} color={colors.textTertiary} />
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

// ─── Stock item modal ──────────────────────────────────────────────────────────

function StockItemModal({
  initial, suppliers, onSave, onDelete, onClose, t,
}: {
  initial?: StockItem;
  suppliers: Supplier[];
  onSave: (s: StockItem) => void;
  onDelete?: () => void;
  onClose: () => void;
  t: (k: string) => string;
}) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [name, setName]       = useState(initial?.name ?? "");
  const [category, setCat]    = useState<StockCategory>(initial?.category ?? "medicament");
  const [quantity, setQty]    = useState(String(initial?.quantity ?? 0));
  const [unit, setUnit]       = useState(initial?.unit ?? "");
  const [minThreshold, setMin] = useState(String(initial?.minThreshold ?? 0));
  const [supplier, setSupplier] = useState(initial?.supplier ?? "");
  const [expiryDate, setExpiry] = useState(initial?.expiryDate ?? "");
  const [notes, setNotes]     = useState(initial?.notes ?? "");

  const intOr0 = (s: string) => { const n = parseInt(s, 10); return Number.isFinite(n) ? n : 0; };
  const submit = () => {
    if (!name.trim()) return;
    onSave({
      id: initial?.id ?? uuid(),
      name: name.trim(),
      category,
      quantity: intOr0(quantity),
      unit: unit.trim() || "u.",
      minThreshold: intOr0(minThreshold),
      supplier: supplier.trim() || undefined,
      expiryDate: expiryDate.trim() || undefined,
      notes: notes.trim() || undefined,
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.mOverlay}>
        <View style={styles.mSheet}>
          <View style={styles.mHandle} />
          <View style={styles.mHeader}>
            <Text style={styles.mTitle}>{initial ? t("stock.editItem") : t("stock.addItem")}</Text>
            <Pressable onPress={onClose} hitSlop={10}><Icon name="close" size={22} color={colors.textSecondary} /></Pressable>
          </View>
          <ScrollView style={{ maxHeight: 420 }} keyboardShouldPersistTaps="handled">
            <Text style={styles.mLabel}>{t("stock.name")}</Text>
            <TextInput style={styles.mInput} value={name} onChangeText={setName}
              placeholder={t("stock.namePlaceholder")} placeholderTextColor={colors.textTertiary} />

            <Text style={styles.mLabel}>{t("stock.category")}</Text>
            <View style={styles.chipRow}>
              {CATEGORIES.map((c) => (
                <Pressable key={c}
                  style={[styles.chip, category === c && { backgroundColor: STOCK_CATEGORY_COLORS[c] + "22", borderColor: STOCK_CATEGORY_COLORS[c] }]}
                  onPress={() => setCat(c)}>
                  <Text style={[styles.chipText, category === c && { color: STOCK_CATEGORY_COLORS[c], fontWeight: "700" }]}>
                    {STOCK_CATEGORY_LABELS[c]}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.mLabel}>{t("stock.quantity")}</Text>
                <TextInput style={styles.mInput} value={quantity} onChangeText={setQty} keyboardType="numeric"
                  placeholder="0" placeholderTextColor={colors.textTertiary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.mLabel}>{t("stock.unit")}</Text>
                <TextInput style={styles.mInput} value={unit} onChangeText={setUnit}
                  placeholder={t("stock.unitPlaceholder")} placeholderTextColor={colors.textTertiary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.mLabel}>{t("stock.minThreshold")}</Text>
                <TextInput style={styles.mInput} value={minThreshold} onChangeText={setMin} keyboardType="numeric"
                  placeholder="0" placeholderTextColor={colors.textTertiary} />
              </View>
            </View>

            <Text style={styles.mLabel}>{t("stock.expiryDate")}</Text>
            <TextInput style={styles.mInput} value={expiryDate} onChangeText={setExpiry}
              placeholder="YYYY-MM-DD" placeholderTextColor={colors.textTertiary} />

            <Text style={styles.mLabel}>{t("stock.supplier")}</Text>
            <TextInput style={styles.mInput} value={supplier} onChangeText={setSupplier}
              placeholder={suppliers.map((s) => s.name).slice(0, 2).join(", ") || "…"} placeholderTextColor={colors.textTertiary} />

            <Text style={styles.mLabel}>{t("stock.notes")}</Text>
            <TextInput style={[styles.mInput, { height: 60 }]} value={notes} onChangeText={setNotes} multiline
              placeholder="…" placeholderTextColor={colors.textTertiary} />
          </ScrollView>
          <View style={styles.mBtnRow}>
            {onDelete && (
              <Pressable style={styles.mDeleteBtn} onPress={onDelete}>
                <Icon name="delete" size={16} color={colors.danger} />
              </Pressable>
            )}
            <Pressable style={styles.mCancelBtn} onPress={onClose}><Text style={styles.mCancelText}>{t("cancel")}</Text></Pressable>
            <Pressable style={[styles.mSaveBtn, !name.trim() && { opacity: 0.5 }]} disabled={!name.trim()} onPress={submit}>
              <Text style={styles.mSaveText}>{t("save")}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Supplier modal ────────────────────────────────────────────────────────────

function SupplierModal({
  initial, onSave, onDelete, onClose, t,
}: {
  initial?: Supplier;
  onSave: (s: Supplier) => void;
  onDelete?: () => void;
  onClose: () => void;
  t: (k: string) => string;
}) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [name, setName]       = useState(initial?.name ?? "");
  const [phone, setPhone]     = useState(initial?.phone ?? "");
  const [email, setEmail]     = useState(initial?.email ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [products, setProducts] = useState(initial?.products ?? "");
  const [notes, setNotes]     = useState(initial?.notes ?? "");

  const submit = () => {
    if (!name.trim()) return;
    onSave({
      id: initial?.id ?? uuid(),
      name: name.trim(),
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      address: address.trim() || undefined,
      products: products.trim() || undefined,
      notes: notes.trim() || undefined,
      createdAt: initial?.createdAt ?? new Date().toISOString(),
    });
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.mOverlay}>
        <View style={styles.mSheet}>
          <View style={styles.mHandle} />
          <View style={styles.mHeader}>
            <Text style={styles.mTitle}>{initial ? t("stock.editSupplier") : t("stock.addSupplier")}</Text>
            <Pressable onPress={onClose} hitSlop={10}><Icon name="close" size={22} color={colors.textSecondary} /></Pressable>
          </View>
          <ScrollView style={{ maxHeight: 420 }} keyboardShouldPersistTaps="handled">
            <Text style={styles.mLabel}>{t("stock.supplierName")}</Text>
            <TextInput style={styles.mInput} value={name} onChangeText={setName}
              placeholder="…" placeholderTextColor={colors.textTertiary} />
            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.mLabel}>{t("stock.phone")}</Text>
                <TextInput style={styles.mInput} value={phone} onChangeText={setPhone} keyboardType="phone-pad"
                  placeholder="06…" placeholderTextColor={colors.textTertiary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.mLabel}>{t("stock.email")}</Text>
                <TextInput style={styles.mInput} value={email} onChangeText={setEmail} keyboardType="email-address"
                  autoCapitalize="none" placeholder="…" placeholderTextColor={colors.textTertiary} />
              </View>
            </View>
            <Text style={styles.mLabel}>{t("stock.products")}</Text>
            <TextInput style={styles.mInput} value={products} onChangeText={setProducts}
              placeholder={t("stock.productsPlaceholder")} placeholderTextColor={colors.textTertiary} />
            <Text style={styles.mLabel}>{t("stock.address")}</Text>
            <TextInput style={styles.mInput} value={address} onChangeText={setAddress}
              placeholder="…" placeholderTextColor={colors.textTertiary} />
            <Text style={styles.mLabel}>{t("stock.notes")}</Text>
            <TextInput style={[styles.mInput, { height: 60 }]} value={notes} onChangeText={setNotes} multiline
              placeholder="…" placeholderTextColor={colors.textTertiary} />
          </ScrollView>
          <View style={styles.mBtnRow}>
            {onDelete && (
              <Pressable style={styles.mDeleteBtn} onPress={onDelete}>
                <Icon name="delete" size={16} color={colors.danger} />
              </Pressable>
            )}
            <Pressable style={styles.mCancelBtn} onPress={onClose}><Text style={styles.mCancelText}>{t("cancel")}</Text></Pressable>
            <Pressable style={[styles.mSaveBtn, !name.trim() && { opacity: 0.5 }]} disabled={!name.trim()} onPress={submit}>
              <Text style={styles.mSaveText}>{t("save")}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Purchase order modal ──────────────────────────────────────────────────────

function PurchaseOrderModal({
  initial, suppliers, stockItems, onSave, onDelete, onClose, t,
}: {
  initial?: PurchaseOrder;
  suppliers: Supplier[];
  stockItems: StockItem[];
  onSave: (p: PurchaseOrder) => void;
  onDelete?: () => void;
  onClose: () => void;
  t: (k: string) => string;
}) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [supplierId, setSupplierId] = useState(initial?.supplierId ?? "");
  const [status, setStatus]   = useState<PurchaseOrderStatus>(initial?.status ?? "draft");
  const [orderedAt, setOrdered] = useState(initial?.orderedAt ?? "");
  const [expectedAt, setExpected] = useState(initial?.expectedAt ?? "");
  const [notes, setNotes]     = useState(initial?.notes ?? "");
  const [lines, setLines]     = useState<PurchaseOrderLine[]>(
    initial?.lines?.length ? initial.lines : [{ itemName: "", quantity: 1, unitPrice: undefined }]
  );

  const setLine = (i: number, patch: Partial<PurchaseOrderLine>) =>
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const addLine = () => setLines((prev) => [...prev, { itemName: "", quantity: 1, unitPrice: undefined }]);
  const removeLine = (i: number) => setLines((prev) => prev.filter((_, idx) => idx !== i));

  const total = lines.reduce((s, l) => s + (l.quantity || 0) * (l.unitPrice ?? 0), 0);
  const valid = lines.some((l) => l.itemName.trim());

  const submit = () => {
    if (!valid) return;
    const sup = suppliers.find((s) => s.id === supplierId);
    const cleaned = lines
      .filter((l) => l.itemName.trim())
      .map((l) => ({ ...l, itemName: l.itemName.trim(), quantity: l.quantity || 0, unitPrice: l.unitPrice }));
    onSave({
      id: initial?.id ?? uuid(),
      supplierId: supplierId || undefined,
      supplierName: sup?.name,
      lines: cleaned,
      status,
      orderedAt: orderedAt.trim() || undefined,
      expectedAt: expectedAt.trim() || undefined,
      receivedAt: status === "received" ? (initial?.receivedAt ?? new Date().toISOString().slice(0, 10)) : initial?.receivedAt,
      notes: notes.trim() || undefined,
      createdAt: initial?.createdAt ?? new Date().toISOString(),
    });
  };

  const numOr = (s: string, d?: number) => { const n = parseFloat(s.replace(",", ".")); return Number.isFinite(n) ? n : d; };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.mOverlay}>
        <View style={styles.mSheet}>
          <View style={styles.mHandle} />
          <View style={styles.mHeader}>
            <Text style={styles.mTitle}>{initial ? t("stock.editOrder") : t("stock.addOrder")}</Text>
            <Pressable onPress={onClose} hitSlop={10}><Icon name="close" size={22} color={colors.textSecondary} /></Pressable>
          </View>
          <ScrollView style={{ maxHeight: 440 }} keyboardShouldPersistTaps="handled">
            <Text style={styles.mLabel}>{t("stock.supplier")}</Text>
            <View style={styles.chipRow}>
              {suppliers.length === 0 && <Text style={styles.poHint}>{t("stock.emptySuppliers")}</Text>}
              {suppliers.map((s) => (
                <Pressable key={s.id}
                  style={[styles.chip, supplierId === s.id && { backgroundColor: colors.brandSoft, borderColor: colors.brand }]}
                  onPress={() => setSupplierId(supplierId === s.id ? "" : s.id)}>
                  <Text style={[styles.chipText, supplierId === s.id && { color: colors.brand, fontWeight: "700" }]}>{s.name}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.mLabel}>{t("stock.poLines")}</Text>
            {lines.map((l, i) => (
              <View key={i} style={styles.poLineRow}>
                <TextInput style={[styles.mInput, { flex: 3, marginBottom: 0 }]} value={l.itemName}
                  onChangeText={(s) => setLine(i, { itemName: s })}
                  placeholder={stockItems[0]?.name || t("stock.poItem")} placeholderTextColor={colors.textTertiary} />
                <TextInput style={[styles.mInput, { width: 48, marginBottom: 0 }]} value={String(l.quantity)}
                  onChangeText={(s) => setLine(i, { quantity: numOr(s, 0) ?? 0 })} keyboardType="numeric"
                  placeholder="Qté" placeholderTextColor={colors.textTertiary} />
                <TextInput style={[styles.mInput, { width: 64, marginBottom: 0 }]} value={l.unitPrice != null ? String(l.unitPrice) : ""}
                  onChangeText={(s) => setLine(i, { unitPrice: numOr(s) })} keyboardType="numeric"
                  placeholder="PU" placeholderTextColor={colors.textTertiary} />
                <Pressable hitSlop={6} onPress={() => removeLine(i)}>
                  <Icon name="close" size={16} color={colors.textTertiary} />
                </Pressable>
              </View>
            ))}
            <Pressable style={styles.addInlineBtn} onPress={addLine}>
              <Icon name="add" size={13} color={colors.brand} />
              <Text style={styles.addInlineText}>{t("stock.poAddLine")}</Text>
            </Pressable>
            <Text style={styles.poTotalLine}>{t("stock.poTotal")}: {total.toLocaleString("fr-FR")} MAD</Text>

            <Text style={styles.mLabel}>{t("stock.poStatus")}</Text>
            <View style={styles.chipRow}>
              {PO_STATUSES.map((st) => (
                <Pressable key={st}
                  style={[styles.chip, status === st && { backgroundColor: PO_STATUS_COLORS[st] + "22", borderColor: PO_STATUS_COLORS[st] }]}
                  onPress={() => setStatus(st)}>
                  <Text style={[styles.chipText, status === st && { color: PO_STATUS_COLORS[st], fontWeight: "700" }]}>{PO_STATUS_LABELS[st]}</Text>
                </Pressable>
              ))}
            </View>

            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.mLabel}>{t("stock.poOrderedAt")}</Text>
                <TextInput style={styles.mInput} value={orderedAt} onChangeText={setOrdered}
                  placeholder="YYYY-MM-DD" placeholderTextColor={colors.textTertiary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.mLabel}>{t("stock.poExpectedAt")}</Text>
                <TextInput style={styles.mInput} value={expectedAt} onChangeText={setExpected}
                  placeholder="YYYY-MM-DD" placeholderTextColor={colors.textTertiary} />
              </View>
            </View>

            <Text style={styles.mLabel}>{t("stock.notes")}</Text>
            <TextInput style={[styles.mInput, { height: 56 }]} value={notes} onChangeText={setNotes} multiline
              placeholder="…" placeholderTextColor={colors.textTertiary} />
          </ScrollView>
          <View style={styles.mBtnRow}>
            {onDelete && (
              <Pressable style={styles.mDeleteBtn} onPress={onDelete}>
                <Icon name="delete" size={16} color={colors.danger} />
              </Pressable>
            )}
            <Pressable style={styles.mCancelBtn} onPress={onClose}><Text style={styles.mCancelText}>{t("cancel")}</Text></Pressable>
            <Pressable style={[styles.mSaveBtn, !valid && { opacity: 0.5 }]} disabled={!valid} onPress={submit}>
              <Text style={styles.mSaveText}>{t("save")}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (c: ColorPalette) => StyleSheet.create({
  header: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.md,
    backgroundColor: c.surface, borderBottomWidth: 1, borderBottomColor: c.border,
  },
  backBtn: { width: 38, height: 38, borderRadius: radii.md, alignItems: "center", justifyContent: "center", backgroundColor: c.brandSoft },
  headerTitle: { ...typography.h3, color: c.textPrimary, flex: 1 },
  addBtn: { width: 38, height: 38, borderRadius: radii.md, backgroundColor: c.brand, alignItems: "center", justifyContent: "center" },

  tabs: { flexDirection: "row", backgroundColor: c.surface, borderBottomWidth: 1, borderBottomColor: c.border },
  tab: { flex: 1, paddingVertical: 12, alignItems: "center", borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabActive: { borderBottomColor: c.brand },
  tabText: { fontSize: 13, fontWeight: "600", color: c.textTertiary },
  tabTextActive: { color: c.brand },

  scroll: { padding: spacing.lg, gap: spacing.sm },
  alertRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.xs },
  alertChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radii.pill },
  alertText: { fontSize: 12, fontWeight: "700" },

  card: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    backgroundColor: c.surface, borderRadius: radii.lg, padding: spacing.md,
    borderWidth: 1, borderColor: c.border, ...shadows.card,
  },
  catBar: { width: 4, alignSelf: "stretch", borderRadius: 2 },
  cardName: { fontSize: 15, fontWeight: "700", color: c.textPrimary },
  cardSub: { fontSize: 12, color: c.textSecondary, marginTop: 2 },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 5 },
  tag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radii.pill },
  tagText: { fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.3 },

  qtyBox: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  qtyBtn: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: c.border, alignItems: "center", justifyContent: "center", backgroundColor: c.bg },
  qtyBtnText: { fontSize: 18, fontWeight: "700", color: c.textPrimary, lineHeight: 20 },
  qtyMid: { alignItems: "center", minWidth: 44 },
  qtyVal: { fontSize: 17, fontWeight: "800", color: c.textPrimary },
  qtyUnit: { fontSize: 10, color: c.textTertiary },
  callBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: c.brandSoft },

  empty: { alignItems: "center", gap: spacing.sm, paddingVertical: spacing.xxl },
  emptyText: { fontSize: 13, color: c.textTertiary },

  // Modals
  mOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "#00000055" },
  mSheet: { backgroundColor: c.surface, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, padding: spacing.lg, paddingBottom: spacing.xxl },
  mHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: c.border, alignSelf: "center", marginBottom: spacing.md },
  mHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm },
  mTitle: { ...typography.h3, color: c.textPrimary },
  mLabel: { fontSize: 12, fontWeight: "600", color: c.textSecondary, marginBottom: 6, marginTop: spacing.sm },
  mInput: { backgroundColor: c.bg, borderRadius: radii.sm, borderWidth: 1, borderColor: c.border, paddingHorizontal: spacing.md, paddingVertical: 10, fontSize: 15, color: c.textPrimary },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radii.pill, borderWidth: 1, borderColor: c.border, backgroundColor: c.bg },
  chipText: { fontSize: 12, color: c.textSecondary },
  mBtnRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg, alignItems: "center" },
  mDeleteBtn: { width: 46, paddingVertical: 13, borderRadius: radii.lg, borderWidth: 1, borderColor: c.danger + "55", alignItems: "center" },
  mCancelBtn: { flex: 1, paddingVertical: 13, borderRadius: radii.lg, borderWidth: 1, borderColor: c.border, alignItems: "center" },
  mCancelText: { fontSize: 15, fontWeight: "600", color: c.textSecondary },
  mSaveBtn: { flex: 1, paddingVertical: 13, borderRadius: radii.lg, backgroundColor: c.brand, alignItems: "center" },
  mSaveText: { fontSize: 15, fontWeight: "700", color: c.textOnDark },

  // Purchase orders
  poTotal: { fontSize: 13, fontWeight: "800", color: c.textPrimary, alignSelf: "center" },
  poHint: { fontSize: 12, color: c.textTertiary, fontStyle: "italic" },
  poLineRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs, marginBottom: 6 },
  poTotalLine: { fontSize: 13, fontWeight: "800", color: c.textPrimary, marginTop: spacing.sm, textAlign: "right" },
  addInlineBtn: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", paddingVertical: 6, paddingHorizontal: 8, borderRadius: radii.pill, backgroundColor: c.brandSoft, marginTop: 2 },
  addInlineText: { fontSize: 12, fontWeight: "600", color: c.brand },
});
