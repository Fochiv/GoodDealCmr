// Inject auth token into all API requests
export function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem("gd_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function formatRef(orderId: number): string {
  return `GD${String(orderId).padStart(10, "0")}`;
}

export function formatFCFA(amount: number): string {
  return new Intl.NumberFormat("fr-FR").format(amount) + " FCFA";
}

export function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateStr));
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "paid":      return "text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400";
    case "confirmed": return "text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400";
    case "processing":return "text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400";
    case "pending":   return "text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400";
    case "failed":    return "text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400";
    case "cancelled": return "text-gray-600 bg-gray-100 dark:bg-gray-900/30 dark:text-gray-400";
    default:          return "text-gray-600 bg-gray-100";
  }
}

export function getStatusLabel(status: string): string {
  switch (status) {
    case "paid":       return "Livré";
    case "confirmed":  return "En livraison";
    case "processing": return "En attente";
    case "pending":    return "En attente";
    case "failed":     return "Échoué";
    case "cancelled":  return "Annulé";
    default:           return status;
  }
}
