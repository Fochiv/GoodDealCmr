const ASHTECH_BASE_URL = "https://www.ashtechpay.com/v1";
const ASHTECH_TRANSACTION_PREFIX = "ashtech:";
const ASHTECH_REQUEST_TIMEOUT_MS = 20_000;
const OPERATOR_MATCHERS: Record<string, RegExp> = {
  mtn_momo: /\bmtn\b/i,
  orange_money: /\borange\b/i,
};

interface AshtechCountry {
  code: string;
  currency: string;
  operators: string[];
}

export interface AshtechTransaction {
  transaction_id: string;
  status: string;
  reference?: string;
  message?: string;
  [key: string]: unknown;
}

let cameroonCatalogueCache: { country: AshtechCountry; expiresAt: number } | undefined;

function getApiKey(): string {
  const key = (process.env.ASHTECH_API_KEY ?? "").trim();
  if (!key) throw new Error("La clé Direct API ASHTECH_API_KEY n'est pas configurée");
  return key;
}

function getNotifyUrl(): string {
  const configuredBase = (process.env.BASE_URL ?? "").trim().replace(/\/+$/, "");
  const replDomain = (process.env.REPLIT_DEV_DOMAIN ?? "").trim();
  const base = configuredBase || (replDomain ? `https://${replDomain}` : "");

  if (!base || !base.startsWith("https://")) {
    throw new Error("Configurez BASE_URL avec l'URL HTTPS publique du serveur pour recevoir les notifications AshTech");
  }

  return `${base}/api/payments/ipn`;
}

async function readJson(response: Response): Promise<unknown> {
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error("AshTech Pay a renvoyé une réponse JSON invalide");
  }

  if (!response.ok) {
    const body = payload && typeof payload === "object" && !Array.isArray(payload)
      ? payload as Record<string, unknown>
      : {};
    const message = typeof body.message === "string" ? body.message : "La requête AshTech Pay a échoué";
    throw new Error(`${message} (HTTP ${response.status})`);
  }

  return payload;
}

async function ashtechFetch(path: string, init: RequestInit = {}): Promise<Record<string, unknown>> {
  const response = await fetch(`${ASHTECH_BASE_URL}${path}`, {
    ...init,
    signal: init.signal ?? AbortSignal.timeout(ASHTECH_REQUEST_TIMEOUT_MS),
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });
  const payload = await readJson(response);
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("AshTech Pay a renvoyé une réponse inattendue");
  }
  return payload as Record<string, unknown>;
}

async function getCameroonCatalogue(): Promise<AshtechCountry> {
  if (cameroonCatalogueCache && cameroonCatalogueCache.expiresAt > Date.now()) {
    return cameroonCatalogueCache.country;
  }

  const response = await fetch(`${ASHTECH_BASE_URL}/countries`, {
    headers: { Authorization: `Bearer ${getApiKey()}` },
    signal: AbortSignal.timeout(ASHTECH_REQUEST_TIMEOUT_MS),
  });
  const payload = await readJson(response);
  if (!Array.isArray(payload)) {
    throw new Error("Le catalogue AshTech Pay n'a pas le format attendu");
  }

  const country = payload.find(
    (item): item is AshtechCountry =>
      !!item &&
      typeof item === "object" &&
      (item as AshtechCountry).code === "CM" &&
      (item as AshtechCountry).currency === "XAF" &&
      Array.isArray((item as AshtechCountry).operators),
  );

  if (!country) {
    throw new Error("Le Cameroun n'est pas disponible dans le catalogue Mobile Money AshTech");
  }

  cameroonCatalogueCache = { country, expiresAt: Date.now() + 5 * 60 * 1000 };
  return country;
}

export function normalizeCameroonPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const nationalNumber = digits.startsWith("237") ? digits.slice(3) : digits;

  if (!/^6\d{8}$/.test(nationalNumber)) {
    throw new Error("Utilisez un numéro Mobile Money du Cameroun au format 6XX XXX XXX ou +237 6XX XXX XXX");
  }

  return `237${nationalNumber}`;
}

async function getCameroonOperator(paymentMethod: string): Promise<string> {
  const matcher = OPERATOR_MATCHERS[paymentMethod];
  if (!matcher) throw new Error(`Méthode de paiement inconnue: ${paymentMethod}`);

  const country = await getCameroonCatalogue();
  const operator = country.operators.find((name) => matcher.test(name));
  if (!operator) {
    const label = paymentMethod === "mtn_momo" ? "MTN Money" : "Orange Money";
    throw new Error(`${label} n'est pas actif dans le catalogue AshTech Pay au Cameroun`);
  }

  return operator;
}

export function toStoredAshtechTransactionId(transactionId: string): string {
  return `${ASHTECH_TRANSACTION_PREFIX}${transactionId}`;
}

export function isAshtechTransactionId(transactionId: string | null | undefined): boolean {
  return !!transactionId?.startsWith(ASHTECH_TRANSACTION_PREFIX);
}

export function getAshtechTransactionId(storedId: string): string | null {
  return isAshtechTransactionId(storedId)
    ? storedId.slice(ASHTECH_TRANSACTION_PREFIX.length)
    : null;
}

export async function initiateAshtechPayment(params: {
  amount: number;
  destination: string;
  paymentMethod: string;
  orderId: number;
}): Promise<AshtechTransaction> {
  if (!Number.isInteger(params.amount) || params.amount <= 0) {
    throw new Error("Le montant du paiement doit être un entier positif");
  }

  const [phone, operator] = await Promise.all([
    Promise.resolve(normalizeCameroonPhone(params.destination)),
    getCameroonOperator(params.paymentMethod),
  ]);

  const payload = await ashtechFetch("/collect", {
    method: "POST",
    body: JSON.stringify({
      amount: params.amount,
      currency: "XAF",
      country_code: "CM",
      operator,
      phone,
      reference: `gooddeal-order-${params.orderId}`,
      notify_url: getNotifyUrl(),
    }),
  });

  if (typeof payload.transaction_id !== "string" || !payload.transaction_id.trim()) {
    throw new Error("AshTech Pay n'a pas renvoyé d'identifiant de transaction");
  }

  if (typeof payload.status !== "string" || !payload.status.trim()) {
    throw new Error("AshTech Pay n'a pas renvoyé le statut de la transaction");
  }

  return payload as unknown as AshtechTransaction;
}

export async function checkAshtechStatus(transactionId: string): Promise<string> {
  const payload = await ashtechFetch(`/transaction/${encodeURIComponent(transactionId)}`);
  if (typeof payload.status !== "string") {
    throw new Error("AshTech Pay n'a pas renvoyé le statut de la transaction");
  }
  return payload.status.toLowerCase();
}