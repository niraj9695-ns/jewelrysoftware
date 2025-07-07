import React, { useEffect, useState } from "react";
import Header from "./components/Header";
import Navigation from "./components/Navigation";
import Counters from "./pages/Counters";
import GoldPurities from "./pages/GoldPurities";
import DailyEntry from "./pages/DailyEntry";
import BalanceReport from "./pages/BalanceReport";
import LoginPage from "./pages/LoginPage";
import "./assets/styles/main.css";

const App = () => {
  const [view, setView] = useState("counters");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Check token on load
  useEffect(() => {
    const token = localStorage.getItem("token");
    setIsLoggedIn(!!token);
  }, []);

  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
  };

  const renderView = () => {
    switch (view) {
      case "counters":
        return <Counters />;
      case "purities":
        return <GoldPurities />;
      case "daily-entry":
        return <DailyEntry />;
      case "balance-report":
        return <BalanceReport />;
      default:
        return <Counters />;
    }
  };

  if (!isLoggedIn) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="main-app">
      <Header />
      <Navigation setView={setView} currentView={view} />
      <div className="dashboard-content view">{renderView()}</div>
    </div>
  );
};

export default App;
