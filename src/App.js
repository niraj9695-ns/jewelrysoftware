import React, { useEffect, useState } from "react";
import Header from "./components/Header";
import Navigation from "./components/Navigation";
import Counters from "./pages/Counters";
import GoldPurities from "./pages/GoldPurities";
import DailyEntry from "./pages/DailyEntry";
import BalanceReport from "./pages/BalanceReport";
import LoginPage from "./pages/LoginPage";
import SalesEntries from "./pages/SalesEntries";
import IssuedStockEntries from "./pages/IssuedStockEntries";
import CounterSummary from "./pages/CounterSummary";
import "./assets/styles/main.css";

const App = () => {
  const [view, setView] = useState("counters");
  const [selectedCounter, setSelectedCounter] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    setIsLoggedIn(!!token);
  }, []);

  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setIsLoggedIn(false);
    setSelectedCounter(null);
    setView("counters");
  };

  const renderView = () => {
    switch (view) {
      case "counters":
        return (
          <Counters
            onViewSales={(counter) => {
              setSelectedCounter(counter);
              setView("sales-entries");
            }}
            onViewStock={(counter) => {
              setSelectedCounter(counter);
              setView("stock-entries");
            }}
            onViewSummary={(counter) => {
              setSelectedCounter(counter);
              setView("counter-summary");
            }}
          />
        );
      case "purities":
        return <GoldPurities />;
      case "daily-entry":
        return <DailyEntry />;
      case "balance-report":
        return <BalanceReport />;
      case "sales-entries":
        return (
          <SalesEntries
            counter={selectedCounter}
            onBack={() => setView("counters")}
          />
        );
      case "stock-entries":
        return (
          <IssuedStockEntries
            counter={selectedCounter}
            onBack={() => setView("counters")}
          />
        );
      case "counter-summary":
        return (
          <CounterSummary
            counter={selectedCounter}
            onBack={() => setView("counters")}
          />
        );
      default:
        return <Counters />;
    }
  };

  if (!isLoggedIn) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="main-app">
      {/* Pass selectedCounter?.id to Header */}
      <Header onLogout={handleLogout} counterId={selectedCounter?.id} />
      <Navigation setView={setView} currentView={view} />
      <div className="dashboard-content view">{renderView()}</div>
    </div>
  );
};

export default App;
