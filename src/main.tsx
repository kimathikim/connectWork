import React from "react"
import ReactDOM from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import { QueryClientProvider } from '@tanstack/react-query'
import App from "./App"
import "./index.css"
import { ensureRequiredSkillsColumn } from "./lib/db-utils.js"
import { queryClient } from "./lib/query-client"

// Check if the required_skills column exists in the jobs table
// This will log a warning if the column doesn't exist
ensureRequiredSkillsColumn().catch(error => {
  console.error('Error checking required_skills column:', error);
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
)

