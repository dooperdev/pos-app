// app/home/index.js
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Dimensions,
  Alert,
  ScrollView,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Picker } from "@react-native-picker/picker";
import { BluetoothEscposPrinter } from "react-native-thermal-receipt-printer";
import SidebarButton from "../components/SidebarButton";
import CartModal from "../components/CartModal";
import TenderModal from "../components/TenderModal";
import ActionModal from "../components/ActionModal";
import DiscountModal from "../components/DiscountModal";
import CashModal from "../components/CashModal";
import GCashModal from "../components/GcashModal";
import SplitTenderModal from "../components/SplitTenderModal";
import SuspendSaleModal from "../components/SuspendSaleModal";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system";
import { useSQLiteContext } from "expo-sqlite";
import { logActivity } from "../utils/activityLogger";
import { useAuth } from "../context/AuthContext";
import PinPermissionModal from "../components/PinPermissionModal";
import { generateReceiptText } from "../utils/receiptTemplate";
export default function Home({ navigation }) {
  const [cartVisible, setCartVisible] = useState(false);
  const [tenderVisible, setTenderVisible] = useState(false);
  const [discountVisible, setDiscountVisible] = useState(false);
  const [actionVisible, setActionVisible] = useState(false);
  const [cart, setCart] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);

  const [cashVisible, setCashVisible] = useState(false);
  const [gcashVisible, setGcashVisible] = useState(false);
  const [splitVisible, setSplitVisible] = useState(false);

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchText, setSearchText] = useState("");

  const [suspendModalVisible, setSuspendModalVisible] = useState(false);
  const [suspendList, setSuspendList] = useState([]);

  // PIN permission
  const [pinVisible, setPinVisible] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  const requestPermission = (type, payload = null) => {
    setPendingAction({ type, payload });
    setPinVisible(true);
  };

  const { logout } = useAuth();
  const handleLogout = async () => {
    if (user) {
      await logActivity(db, user, "Logout", `User ${user.Name} logged out.`);
    }
    // 1. Call context logout
    logout();

    // 2. Reset navigation stack to Login
    navigation.reset({
      index: 0,
      routes: [{ name: "Login" }], // replace "Login" with your actual login screen name
    });
  };

  const handlePinSuccess = async () => {
    if (!pendingAction) return;

    const { type, payload } = pendingAction;

    setPinVisible(false);
    setPendingAction(null);

    switch (type) {
      case "EMPTY_CART":
        await emptyCart();
        break;

      case "REMOVE_ITEM":
        removeFromCart(payload.key);
        await logActivity(db, user, "Remove Item", `Removed ${payload.Name}`);
        break;

      case "DECREASE_TO_ZERO":
        removeFromCart(payload.key);
        await logActivity(
          db,
          user,
          "Remove Item (Qty 1)",
          `Removed ${payload.Name} via minus button`,
        );
        break;

      case "SUSPEND_SALE":
        await handleSuspendSale();
        break;

      default:
        break;
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchName = p.Name.toLowerCase().includes(searchText.toLowerCase());

    const matchCategory = selectedCategory
      ? p.CategoryID === selectedCategory
      : true;

    return matchName && matchCategory;
  });

  const db = useSQLiteContext();
  const { user } = useAuth();

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadProducts();
      loadCategories();
    }, []),
  );

  const loadProducts = async () => {
    const result = await db.getAllAsync(`
    SELECT Products.*,
           IFNULL(Inventory.QuantityInStock, 0) as Stock
    FROM Products
    LEFT JOIN Inventory
    ON Products.ProductID = Inventory.ProductID
  `);

    setProducts(result);
  };

  const loadCategories = async () => {
    const result = await db.getAllAsync("SELECT * FROM Categories");
    setCategories(result);
  };

  /* =====================
     CART LOGIC
  ====================== */

  const addToCart = (product) => {
    if (product.Stock <= 0) {
      Alert.alert("Out of Stock", "This item has no stock left.");
      return;
    }

    setCart((prev) => {
      const existing = prev.find((i) => i.ProductID === product.ProductID);
      if (existing) {
        if (existing.qty >= product.Stock) {
          Alert.alert("Stock Limit", "Not enough stock available.");
          return prev;
        }
        return prev.map((i) =>
          i.ProductID === product.ProductID ? { ...i, qty: i.qty + 1 } : i,
        );
      }

      return [
        ...prev,
        {
          ...product,
          qty: 1,
          discount: 0,
          discountType: "₱",
          key: `${product.ProductID}-${Date.now()}`, // <-- unique key
        },
      ];
    });
  };

  const increaseQty = (key) => {
    setCart((prev) =>
      prev.map((item) =>
        item.key === key ? { ...item, qty: item.qty + 1 } : item,
      ),
    );
  };

  const decreaseQty = (key) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.key === key ? { ...item, qty: item.qty - 1 } : item,
        )
        .filter((item) => item.qty > 0),
    );
  };

  const removeFromCart = (key) => {
    setCart((prev) => prev.filter((item) => item.key !== key));
  };

  const emptyCart = async () => {
    setCart([]);
    await logActivity(db, user, "Empty Cart", `All products are removed.`);
  };

  const handleDecreaseQty = (item) => {
    if (item.qty === 1) {
      requestPermission("DECREASE_TO_ZERO", item);
    } else {
      decreaseQty(item.key);
    }
  };

  const getItemTotal = (item) => {
    // Use numeric conversion in case it's a string from SQLite
    const price = Number(item.RetailPrice) || 0;
    let total = price * (item.qty || 0);

    if (item.discountType === "%") {
      total -= total * ((Number(item.discount) || 0) / 100);
    } else {
      total -= Number(item.discount) || 0;
    }

    return Math.max(total, 0);
  };

  const subtotal = cart.reduce(
    (sum, item) => sum + (Number(item.RetailPrice) || 0) * (item.qty || 0),
    0,
  );

  const discountTotal = cart.reduce((sum, item) => {
    const original = (Number(item.RetailPrice) || 0) * (item.qty || 0);
    const discounted = getItemTotal(item);
    return sum + (original - discounted);
  }, 0);

  const total = subtotal - discountTotal;

  const applyDiscount = (updatedItem) => {
    setCart((prev) =>
      prev.map((item) => (item.key === updatedItem.key ? updatedItem : item)),
    );
  };

  const openDiscount = (item) => {
    setSelectedItem(item);
    setDiscountVisible(true);
  };

  const saveReceiptAsPDF = async (receiptHTML, transactionNumber) => {
    try {
      const { uri } = await Print.printToFileAsync({
        html: receiptHTML,
      });

      // Directly share without moving
      await Sharing.shareAsync(uri);

      Alert.alert("PDF Saved", "Receipt ready to share successfully.");
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to save or share PDF.");
    }
  };

  const saveSale = async (paymentType, paymentData) => {
    try {
      // --- 1. Generate Transaction Number ---
      const today = new Date();
      const mm = String(today.getMonth() + 1).padStart(2, "0");
      const dd = String(today.getDate()).padStart(2, "0");
      const yyyy = today.getFullYear();
      const dateStr = `${mm}${dd}${yyyy}`;

      const todayTransactions = await db.getAllAsync(`
      SELECT COUNT(*) as count FROM SalesTransactions 
      WHERE date(TransactionDate) = date('now')
    `);

      const count = (todayTransactions[0]?.count || 0) + 1;
      const incremental = String(count).padStart(3, "0");
      const transactionNumber = `${dateStr}-${incremental}`;

      // --- 2. Insert into SalesTransactions ---
      await db.runAsync(
        `INSERT INTO SalesTransactions (TransactionNumber, UserID, TotalAmount, PaymentType) 
       VALUES (?, ?, ?, ?)`,
        [transactionNumber, user.UserID, total, paymentType],
      );

      // --- 3. Get last inserted TransactionID ---
      const lastTransaction = await db.getAllAsync(
        `SELECT last_insert_rowid() as TransactionID`,
      );
      const transactionId = lastTransaction[0].TransactionID;

      if (!transactionId) throw new Error("Failed to get TransactionID");

      // --- 4. Insert each cart item into OrderDetails & update inventory ---
      for (const item of cart) {
        const unitPrice = Number(item.RetailPrice) || 0;
        const quantity = item.qty || 1;
        const discount = Number(item.discount) || 0;
        const discountType = item.discountType || "₱";

        await db.runAsync(
          `INSERT INTO OrderDetails (TransactionID, ProductID, Quantity, UnitPrice, Discount, DiscountType)
         VALUES (?, ?, ?, ?, ?, ?)`,
          [
            transactionId,
            item.ProductID,
            quantity,
            unitPrice,
            discount,
            discountType,
          ],
        );

        // Update inventory
        await db.runAsync(
          `UPDATE Inventory SET QuantityInStock = QuantityInStock - ? WHERE ProductID = ?`,
          [quantity, item.ProductID],
        );
      }

      // --- 5. Update CashRegistry if Cash / Split ---
      if (paymentType === "Cash" || paymentType === "Split") {
        const shifts = await db.getAllAsync(`
    SELECT * FROM CashRegistry 
    WHERE Status = 'OPEN' 
    ORDER BY OpenedAt DESC 
    LIMIT 1
  `);
        const shift = shifts[0];

        if (shift) {
          let cashPaid = 0;
          let gcashPaid = 0;

          if (paymentType === "Cash") {
            const match = paymentData.match(/Cash ₱([\d.]+)/);
            cashPaid = match ? parseFloat(match[1]) : 0;
          } else if (paymentType === "Split") {
            const matchCash = paymentData.match(/Cash ₱([\d.]+)/);
            const matchGCash = paymentData.match(/GCash ₱([\d.]+)/);
            cashPaid = matchCash ? parseFloat(matchCash[1]) : 0;
            gcashPaid = matchGCash ? parseFloat(matchGCash[1]) : 0;
          }

          const newExpectedCash =
            (shift.OpeningCash || 0) + (shift.TotalCashSales || 0) + cashPaid; // Include only cash part

          const newTotalCashSales = (shift.TotalCashSales || 0) + cashPaid;
          const newTotalSplitCash = (shift.TotalSplitCash || 0) + gcashPaid;

          await db.runAsync(
            `UPDATE CashRegistry 
       SET ExpectedCash = ?, 
           TotalCashSales = ?, 
           TotalSplitCash = ? 
       WHERE RegistryID = ?`,
            [
              newExpectedCash,
              newTotalCashSales,
              newTotalSplitCash,
              shift.RegistryID,
            ],
          );
        }
      }

      // --- 6. Auto Print to Bluetooth Printer ---
      // --- 6. Auto Print to Bluetooth Printer ---
      try {
        const printerList = await BluetoothEscposPrinter.getDeviceList();
        const printer = printerList[0];

        if (!printer) throw new Error("No Bluetooth printer found.");

        await BluetoothEscposPrinter.connectPrinter(
          printer.inner_mac_address || printer.mac_address,
        );

        await BluetoothEscposPrinter.printText(
          generateReceiptText({
            cart,
            subtotal,
            discount: discountTotal,
            total,
            payment: paymentData,
            transactionNumber,
            userName: user?.Name,
            storeName: "Calle Otso", // optional, default is Calle Otso
          }),
          { encoding: "GBK" },
        );

        await BluetoothEscposPrinter.openDrawer(0, 250);
        await BluetoothEscposPrinter.disconnectPrinter();
      } catch (printError) {
        console.error("Printing error:", printError);

        Alert.alert(
          "Printing Failed",
          "Bluetooth printing failed. Do you want to save the receipt as PDF instead?",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Save as PDF",
              onPress: () =>
                saveReceiptAsPDF(
                  generateReceiptText({
                    cart,
                    subtotal,
                    discount: discountTotal,
                    total,
                    payment: paymentData,
                    transactionNumber,
                    userName: user?.Name,
                  }),
                  transactionNumber,
                ),
            },
          ],
        );
      }

      // --- 7. Clear Cart ---
      emptyCart();

      Alert.alert(
        "Transaction Complete",
        "Sale saved & printed automatically.",
      );
    } catch (error) {
      console.error("Error saving sale:", error);
      Alert.alert("Error", error.message || "Failed to save and print sale.");
    }
  };

  /* ===================== SUSPEND SALE ===================== */
  const handleSuspendSale = async () => {
    if (cart.length === 0) {
      // Show list of suspended sales
      const suspended = await db.getAllAsync(
        `SELECT * FROM SuspendSales ORDER BY CreatedAt DESC`,
      );
      setSuspendList(suspended);
      setSuspendModalVisible(true);
    } else {
      try {
        // Insert into SuspendSales
        await db.runAsync(
          `INSERT INTO SuspendSales (UserID, TotalAmount, CreatedAt) VALUES (?, ?, ?)`,
          [1, total, new Date().toISOString()],
        );

        const lastSuspend = await db.getAllAsync(
          `SELECT last_insert_rowid() as SuspendID`,
        );
        const suspendId = lastSuspend[0].SuspendID;

        for (const item of cart) {
          await db.runAsync(
            `INSERT INTO SuspendSaleItems (SuspendID, ProductID, Name, UnitPrice, Quantity, Discount, DiscountType) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              suspendId,
              item.ProductID,
              item.Name,
              Number(item.RetailPrice) || 0,
              item.qty,
              item.discount || 0,
              item.discountType || "₱",
            ],
          );
        }

        Alert.alert("Sale Suspended", "The current cart has been suspended.");
        emptyCart();
      } catch (error) {
        console.error("Error suspending sale:", error);
      }
    }
  };

  /* =====================
     UI
  ====================== */

  return (
    <View style={styles.container}>
      {/* LEFT SIDEBAR */}
      <View style={styles.sidebar}>
        <ScrollView contentContainerStyle={{ paddingVertical: 10 }}>
          <SidebarButton
            label="Dashboard"
            onPress={() => navigation.navigate("Dashboard")}
          />
          <SidebarButton
            label="Empty Cart"
            onPress={() => requestPermission("EMPTY_CART")}
          />
          <SidebarButton
            label="Suspend Sale"
            onPress={() => requestPermission("SUSPEND_SALE")}
          />
          <SidebarButton
            label="Actions"
            onPress={() => setActionVisible(true)}
          />
          <SidebarButton
            label="Transactions"
            onPress={() => navigation.navigate("Transactions")}
          />
          {/* add spacing before logout */}
          <View style={{ marginTop: 20 }}>
            <SidebarButton label="Logout" primary onPress={handleLogout} />
          </View>
        </ScrollView>
      </View>

      {/* MAIN CONTENT */}
      <View style={styles.main}>
        {/* TOP BAR */}
        <View style={styles.topBar}>
          <TextInput
            placeholder="Search product..."
            value={searchText}
            onChangeText={setSearchText}
            style={styles.search}
          />

          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => setSearchText(searchText)}
          >
            <Text>🔍</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => setCartVisible(true)}
          >
            <Text>🛒 ({cart.length})</Text>
          </TouchableOpacity>
        </View>

        <Picker
          selectedValue={selectedCategory}
          onValueChange={(value) => setSelectedCategory(value)}
        >
          <Picker.Item label="All Categories" value={null} />
          {categories.map((c) => (
            <Picker.Item
              key={c.CategoryID}
              label={c.Name}
              value={c.CategoryID}
            />
          ))}
        </Picker>

        {/* PRODUCT LIST */}
        {/* PRODUCT LIST */}
        <View style={styles.table}>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.headerCell, { flex: 3, minWidth: 150 }]}>
              Product Name
            </Text>
            <Text style={[styles.headerCell, { flex: 1, minWidth: 80 }]}>
              Price
            </Text>
            <Text style={[styles.headerCell, { flex: 1, minWidth: 80 }]}>
              Action
            </Text>
          </View>

          {/* Product Rows */}
          <FlatList
            data={filteredProducts}
            keyExtractor={(item) => item.ProductID.toString()}
            renderItem={({ item }) => (
              <View style={styles.row}>
                <Text style={[styles.cell, { flex: 3, minWidth: 150 }]}>
                  {item.Name}
                </Text>
                <Text style={[styles.cell, { flex: 1, minWidth: 80 }]}>
                  ₱{item.RetailPrice}
                </Text>
                <View
                  style={{
                    flex: 1,
                    minWidth: 80,
                    alignItems: "center",
                  }}
                >
                  <TouchableOpacity
                    style={[
                      styles.addBtn,
                      item.Stock <= 0 && { backgroundColor: "#B0BEC5" },
                    ]}
                    disabled={item.Stock <= 0}
                    onPress={() => addToCart(item)}
                  >
                    <Text style={{ color: "#fff" }}>
                      {item.Stock <= 0 ? "Out" : "Add"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
        </View>

        {/* BOTTOM SUMMARY */}
        <View style={styles.bottomBar}>
          <View>
            <Text>Subtotal: ₱{subtotal.toFixed(2)}</Text>
            <Text>Discount: ₱{discountTotal.toFixed(2)}</Text>
            <Text style={styles.total}>Total: ₱{total.toFixed(2)}</Text>
          </View>

          <TouchableOpacity
            disabled={cart.length === 0}
            style={[styles.tenderBtn, cart.length === 0 && { opacity: 0.4 }]}
            onPress={() => setTenderVisible(true)}
          >
            <Text style={{ color: "#fff" }}>Tender</Text>
          </TouchableOpacity>
        </View>

        {/* MODALS */}
        <ActionModal
          visible={actionVisible}
          onClose={() => setActionVisible(false)}
          navigation={navigation}
        />

        <CartModal
          visible={cartVisible}
          cart={cart}
          onClose={() => setCartVisible(false)}
          // 🔐 REMOVE → PIN
          onRemove={(item) => requestPermission("REMOVE_ITEM", item)}
          onDiscount={openDiscount}
          // ➕ increase stays the same (key only)
          onIncrease={(key) => increaseQty(key)}
          // ➖ decrease: PIN only when qty === 1
          onDecrease={(item) => handleDecreaseQty(item)}
        />

        <DiscountModal
          visible={discountVisible}
          item={selectedItem}
          onApply={applyDiscount}
          onClose={() => setDiscountVisible(false)}
        />

        <TenderModal
          visible={tenderVisible}
          onClose={() => setTenderVisible(false)}
          onCash={() => {
            setTenderVisible(false);
            setCashVisible(true);
          }}
          onGCash={() => {
            setTenderVisible(false);
            setGcashVisible(true);
          }}
          onSplit={() => {
            setTenderVisible(false);
            setSplitVisible(true);
          }}
        />

        <CashModal
          visible={cashVisible}
          total={total}
          onClose={() => setCashVisible(false)}
          onConfirm={(received, change) => {
            // Save the sale and print receipt inside saveSale
            saveSale("Cash", `Cash ₱${received} | Change ₱${change}`);
            setCashVisible(false);
          }}
        />

        <GCashModal
          visible={gcashVisible}
          total={total}
          onClose={() => setGcashVisible(false)}
          onConfirm={(received, reference) => {
            saveSale("GCash", `GCash ₱${received} | Ref: ${reference}`);
            setGcashVisible(false);
          }}
        />

        <SplitTenderModal
          visible={splitVisible}
          total={total}
          onClose={() => setSplitVisible(false)}
          onConfirm={(data) => {
            saveSale(
              "Split",
              `Cash ₱${data.cash} + GCash ₱${data.gcash} | Ref: ${data.reference}`,
            );
            setSplitVisible(false);
          }}
        />

        <SuspendSaleModal
          visible={suspendModalVisible}
          onClose={() => setSuspendModalVisible(false)}
          suspendList={suspendList}
          db={db}
          setCart={setCart}
        />

        <PinPermissionModal
          visible={pinVisible}
          title="Manager PIN Required"
          onCancel={() => {
            setPinVisible(false);
            setPendingAction(null);
          }}
          onSuccess={handlePinSuccess}
        />
      </View>
    </View>
  );
}

const screenWidth = Dimensions.get("window").width;
const isTablet = screenWidth >= 768;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#EEF3F9",
    padding: 10,
    marginTop: 20,
  },
  sidebar: {
    width: isTablet ? 220 : 70, // auto shrink on small screen
    padding: 10,
    backgroundColor: "#fff",
    elevation: 4,
  },
  main: {
    flex: 1,
    padding: 16,
  },
  topBar: {
    flexDirection: "row",
    marginBottom: 10,
  },
  search: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  iconBtn: {
    marginLeft: 10,
    padding: 14,
    backgroundColor: "#2979FF",
    borderRadius: 10,
  },
  table: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 10,
  },
  tableHeader: {
    flexDirection: "row",
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderColor: "#ccc",
    backgroundColor: "#2979FF",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },

  headerCell: {
    fontWeight: "bold",
    fontSize: 16,
    color: "#fff",
    textAlign: "center",
  },

  row: {
    flexDirection: "row",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#eee",
    alignItems: "center",
  },

  cell: {
    fontSize: 16,
    textAlign: "center",
  },

  bottomBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  total: {
    fontSize: 18,
    fontWeight: "bold",
  },
  tenderBtn: {
    backgroundColor: "#2979FF",
    paddingVertical: 18,
    paddingHorizontal: 40,
    borderRadius: 14,
  },
  tenderText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  addBtn: {
    backgroundColor: "#2979FF",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },

  addText: {
    color: "#fff",
    fontWeight: "bold",
  },

  cartPreview: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 10,
    marginTop: 10,
  },

  cartRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
});
