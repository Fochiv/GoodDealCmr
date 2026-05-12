import { createRoot } from "react-dom/client";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import App from "./App";
import "./index.css";

// Inject auth token into all API calls automatically
setAuthTokenGetter(() => localStorage.getItem("gd_token"));

createRoot(document.getElementById("root")!).render(<App />);
