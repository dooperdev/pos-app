// app/_layout.js
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import RegistrationForm from "./auth/register";
import Login from "./auth/login";
import Home from "./home/index";
import { SQLiteProvider } from "expo-sqlite";
import ProductPage from "./product/ProductPage";
import SupplierPage from "./suppliers/index";
import CategoryPage from "./categories/index";
import InventoryPage from "./inventory/index";
import TransactionsPage from "./transactions/index";
import UsersPage from "./users/index";
import { AuthProvider } from "./context/AuthContext";
import ActivityLogsPage from "./activity-logs/index";

const Stack = createNativeStackNavigator();

export default function Layout() {
  return (
    <SQLiteProvider
      databaseName="pos.db"
      onInit={async (db) => {
        await db.execAsync(`
        CREATE TABLE IF NOT EXISTS Users (
            UserID INTEGER PRIMARY KEY AUTOINCREMENT,
            Name TEXT NOT NULL,
            Role TEXT NOT NULL CHECK(Role IN ('Admin','Cashier','Manager')),
            Email TEXT UNIQUE NOT NULL,
            Password TEXT NOT NULL,
            Pin TEXT UNIQUE NOT NULL
        );

        CREATE TABLE IF NOT EXISTS ActivityLogs (
            LogID INTEGER PRIMARY KEY AUTOINCREMENT,
            UserID INTEGER,
            Action TEXT NOT NULL,
            Description TEXT,
            CreatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (UserID) REFERENCES Users(UserID)
        );

        CREATE TABLE IF NOT EXISTS Suppliers (
            SupplierID INTEGER PRIMARY KEY AUTOINCREMENT,
            Name TEXT NOT NULL,
            ContactInfo TEXT
        );

        CREATE TABLE IF NOT EXISTS Categories (
            CategoryID INTEGER PRIMARY KEY AUTOINCREMENT,
            Name TEXT NOT NULL,
            Description TEXT
        );

        CREATE TABLE IF NOT EXISTS Products (
            ProductID INTEGER PRIMARY KEY AUTOINCREMENT,
            Name TEXT NOT NULL,
            Description TEXT,
            SupplierID INTEGER,
            CategoryID INTEGER,
            RetailPrice REAL NOT NULL,
            WholesalePrice REAL,
            FOREIGN KEY (SupplierID) REFERENCES Suppliers(SupplierID),
            FOREIGN KEY (CategoryID) REFERENCES Categories(CategoryID)
        );

        CREATE TABLE IF NOT EXISTS Inventory (
            InventoryID INTEGER PRIMARY KEY AUTOINCREMENT,
            ProductID INTEGER NOT NULL,
            QuantityInStock INTEGER DEFAULT 0,
            FOREIGN KEY (ProductID) REFERENCES Products(ProductID)
        );

        CREATE TABLE IF NOT EXISTS SalesTransactions (
            TransactionID INTEGER PRIMARY KEY AUTOINCREMENT,
            UserID INTEGER NOT NULL,
            TransactionNumber NOT NULL,
            TransactionDate DATETIME DEFAULT CURRENT_TIMESTAMP,
            TotalAmount REAL NOT NULL,
            PaymentType TEXT NOT NULL CHECK(PaymentType IN ('Cash','GCash','Split')),
            FOREIGN KEY (UserID) REFERENCES Users(UserID)
        );

        CREATE TABLE IF NOT EXISTS OrderDetails (
            OrderDetailID INTEGER PRIMARY KEY AUTOINCREMENT,
            TransactionID INTEGER NOT NULL,
            ProductID INTEGER NOT NULL,
            Quantity INTEGER NOT NULL,
            UnitPrice REAL NOT NULL,
            Discount REAL DEFAULT 0,           -- new column
            DiscountType TEXT DEFAULT '₱',     -- new column: '₱' or '%'
            Subtotal REAL GENERATED ALWAYS AS (Quantity * UnitPrice) STORED,
            FOREIGN KEY (TransactionID) REFERENCES SalesTransactions(TransactionID),
            FOREIGN KEY (ProductID) REFERENCES Products(ProductID)
        );

        CREATE TABLE IF NOT EXISTS SuspendSales (
          SuspendID INTEGER PRIMARY KEY AUTOINCREMENT,
          UserID INTEGER,
          TotalAmount REAL,
          CreatedAt TEXT
        );

        CREATE TABLE IF NOT EXISTS SuspendSaleItems (
          ItemID INTEGER PRIMARY KEY AUTOINCREMENT,
          SuspendID INTEGER,
          ProductID INTEGER,
          Name TEXT,
          UnitPrice REAL,
          Quantity INTEGER,
          Discount REAL,
          DiscountType TEXT,
          FOREIGN KEY (SuspendID) REFERENCES SuspendSales(SuspendID)
        );

        `);
      }}
      options={{ useNewConnection: false }}
    >
      <AuthProvider>
        <NavigationContainer>
          <Stack.Navigator initialRouteName="Login">
            <Stack.Screen
              name="Register"
              component={RegistrationForm}
              options={{ headerShown: false }} // normal header
            />
            <Stack.Screen
              name="Login"
              component={Login}
              options={{ headerShown: false }} // normal header
            />
            <Stack.Screen
              name="Home"
              component={Home}
              options={{
                headerShown: false, // hide header
                gestureEnabled: false, // optional: disable swipe back on iOS
              }}
            />

            <Stack.Screen name="Products" component={ProductPage} />
            <Stack.Screen name="Suppliers" component={SupplierPage} />
            <Stack.Screen name="Categories" component={CategoryPage} />
            <Stack.Screen name="Inventory" component={InventoryPage} />
            <Stack.Screen name="Transactions" component={TransactionsPage} />
            <Stack.Screen name="Users" component={UsersPage} />
            <Stack.Screen name="ActivityLogs" component={ActivityLogsPage} />
          </Stack.Navigator>
        </NavigationContainer>
      </AuthProvider>
    </SQLiteProvider>
  );
}
