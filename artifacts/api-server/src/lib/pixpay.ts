const PIXPAY_BASE_URL = "https://proxy-coreapi.pixelinnov.net/api_v1";

// Cashout (collecte depuis le mobile money client)
const SERVICE_IDS: Record<string, number> = {
  mtn_momo: 339,
  orange_money: 337,
};

// Cashin (envoi vers le mobile money du bénéficiaire — retraits)
const CASHIN_SERVICE_IDS: Record<string, number> = {
  mtn: 338,
  orange: 336,
};

function getIpnUrl(): string {
  const base =
    process.env.BASE_URL ||
    (process.env.REPLIT_DEV_DOMAIN
      ? `https://${process.env.REPLIT_DEV_DOMAIN}`
      : "");
  return `${base}/api/payments/ipn`;
}

function formatPhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

export interface PixpayData {
  transaction_id: string;
  amount: number;
  state: string;
  destination: string;
  service_id: number;
  custom_data: string;
}

export interface PixpayResponse {
  data: PixpayData;
  message: string;
  statut_code: number;
}

export interface PixpayStatusResponse {
  data: {
    transaction_id: string;
    state: string;
    amount: number;
    destination: string;
    custom_data: string;
  };
  message: string;
  statut_code: number;
}

export async function checkPixpayStatus(transactionId: string): Promise<PixpayStatusResponse> {
  const apiKey = (process.env.PIXPAY_API_KEY ?? "").trim();
  if (!apiKey) throw new Error("PIXPAY_API_KEY non configurée");

  const response = await fetch(
    `${PIXPAY_BASE_URL}/transaction/${transactionId}?api_key=${encodeURIComponent(apiKey)}`,
    { method: "GET", headers: { "Content-Type": "application/json" } }
  );

  let data: PixpayStatusResponse;
  try {
    data = (await response.json()) as PixpayStatusResponse;
  } catch {
    throw new Error("Réponse invalide de Pixpay");
  }

  return data;
}

export async function initiatePixpayPayment(params: {
  amount: number;
  destination: string;
  paymentMethod: string;
  orderId: number;
}): Promise<PixpayResponse> {
  const apiKey = (process.env.PIXPAY_API_KEY ?? "").trim();
  if (!apiKey) throw new Error("PIXPAY_API_KEY non configurée");

  const serviceId = SERVICE_IDS[params.paymentMethod];
  if (!serviceId)
    throw new Error(`Méthode de paiement inconnue: ${params.paymentMethod}`);

  const body = {
    amount: params.amount,
    destination: formatPhone(params.destination),
    api_key: apiKey,
    ipn_url: getIpnUrl(),
    service_id: serviceId,
    custom_data: `GD_${params.orderId}`,
  };

  const response = await fetch(`${PIXPAY_BASE_URL}/transaction/airtime`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  let data: PixpayResponse;
  try {
    data = (await response.json()) as PixpayResponse;
  } catch {
    throw new Error("Réponse invalide de Pixpay");
  }

  if (!response.ok || data.statut_code !== 200) {
    throw new Error(data.message || "Échec de l'initiation du paiement Pixpay");
  }

  return data;
}

export async function initiatePixpayCashin(params: {
  amount: number;
  destination: string;
  operator: string;
  withdrawalId: number;
}): Promise<PixpayResponse> {
  const apiKey = (process.env.PIXPAY_API_KEY ?? "").trim();
  if (!apiKey) throw new Error("PIXPAY_API_KEY non configurée");

  const serviceId = CASHIN_SERVICE_IDS[params.operator];
  if (!serviceId)
    throw new Error(`Opérateur inconnu pour cashin: ${params.operator}`);

  const body = {
    amount: params.amount,
    destination: formatPhone(params.destination),
    api_key: apiKey,
    ipn_url: getIpnUrl(),
    service_id: serviceId,
    custom_data: `withdrawal_${params.withdrawalId}`,
  };

  const response = await fetch(`${PIXPAY_BASE_URL}/transaction/airtime`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  let data: PixpayResponse;
  try {
    data = (await response.json()) as PixpayResponse;
  } catch {
    throw new Error("Réponse invalide de Pixpay");
  }

  if (!response.ok || data.statut_code !== 200) {
    throw new Error(data.message || "Échec de l'initiation du cashin Pixpay");
  }

  return data;
}
