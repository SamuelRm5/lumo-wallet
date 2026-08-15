import Constants from "expo-constants";

// Envelope de error único de toda la API (docs/APP_MOVIL.md §3).
export type ApiErrorCode =
	| "VALIDATION_ERROR"
	| "UNAUTHENTICATED"
	| "FORBIDDEN"
	| "NOT_FOUND"
	| "CONFLICT"
	| "UPGRADE_REQUIRED"
	| "RATE_LIMITED"
	| "INTERNAL";

export type ApiErrorDetail = { path: string; message: string };

export class ApiError extends Error {
	code: ApiErrorCode;
	details?: ApiErrorDetail[];
	requestId?: string;
	status: number;

	constructor(status: number, body: { code: ApiErrorCode; message: string; details?: ApiErrorDetail[]; requestId?: string }) {
		// `message` ya viene en español y es mostrable tal cual (docs/APP_MOVIL.md §3).
		super(body.message);
		this.status = status;
		this.code = body.code;
		this.details = body.details;
		this.requestId = body.requestId;
	}
}

function apiBaseUrl(): string {
	const url = process.env.EXPO_PUBLIC_API_URL;
	if (!url) {
		throw new Error(
			"Falta EXPO_PUBLIC_API_URL. En desarrollo apunta a la IP de la máquina en la red local, nunca a localhost (docs/APP_MOVIL.md §2).",
		);
	}
	return `${url}/api/v1`;
}

function clientVersion(): string {
	return Constants.expoConfig?.version ?? "0.0.0";
}

// El cliente no conoce el store de sesión (evita un ciclo de imports): la Fase 1
// lo conecta una sola vez con configureAuth() desde src/store/session.ts.
type AuthAdapter = {
	getAccessToken: () => string | null;
	// Devuelve el access token nuevo, o null si la sesión no se pudo renovar
	// (refresh token ausente, vencido o ya reusado).
	refreshAccessToken: () => Promise<string | null>;
};

let authAdapter: AuthAdapter | null = null;

export function configureAuth(adapter: AuthAdapter) {
	authAdapter = adapter;
}

// Cola de refresco de un solo vuelo (docs/APP_MOVIL.md §3): si tres peticiones
// reciben 401 a la vez, solo la primera dispara el refresh; las otras esperan
// esa misma promesa. Reusar un refresh token ya consumido cierra todas las
// sesiones del usuario, así que disparar el refresh más de una vez en paralelo
// autoexpulsa al usuario.
let refreshInFlight: Promise<string | null> | null = null;

function ensureFreshAccessToken(): Promise<string | null> {
	if (!authAdapter) return Promise.resolve(null);
	if (!refreshInFlight) {
		refreshInFlight = authAdapter.refreshAccessToken().finally(() => {
			refreshInFlight = null;
		});
	}
	return refreshInFlight;
}

export type RequestOptions = {
	method?: "GET" | "POST" | "PUT" | "DELETE";
	body?: unknown;
	headers?: Record<string, string>;
	signal?: AbortSignal;
	// Login, refresh y logout no deben reintentarse ante un 401 propio: lo
	// dispararía la propia llamada de refresco y encadenaría el refresh consigo
	// mismo.
	skipAuthRetry?: boolean;
};

async function performRequest(path: string, options: RequestOptions): Promise<Response> {
	const token = authAdapter?.getAccessToken() ?? null;
	return fetch(`${apiBaseUrl()}${path}`, {
		method: options.method ?? "GET",
		headers: {
			"Content-Type": "application/json",
			"X-Client-Version": clientVersion(),
			...(token ? { Authorization: `Bearer ${token}` } : {}),
			...options.headers,
		},
		body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
		signal: options.signal,
	});
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
	let response = await performRequest(path, options);

	if (response.status === 401 && !options.skipAuthRetry && authAdapter) {
		const newToken = await ensureFreshAccessToken();
		if (newToken) {
			response = await performRequest(path, options);
		}
	}

	if (response.status === 304) {
		// El llamador que use ETag decide qué hacer con "sin cambios": aquí no hay cuerpo que parsear.
		return undefined as T;
	}

	const isJson = response.headers.get("content-type")?.includes("application/json");
	const payload = isJson ? await response.json() : undefined;

	if (!response.ok) {
		if (payload?.error) {
			throw new ApiError(response.status, payload.error);
		}
		throw new ApiError(response.status, { code: "INTERNAL", message: "Error de red o del servidor" });
	}

	return payload as T;
}

// Variante de apiRequest que expone el ETag de la respuesta y distingue el 304
// del resto (docs/APP_MOVIL.md §4.2): `apiRequest` devuelve `undefined` en un
// 304 y no deja leer las cabeceras, que es justo lo que necesita el arranque
// para no volver a bajar cuentas, categorías y resumen si nada cambió.
export type ETagResult<T> = { notModified: boolean; data: T | null; etag: string | null };

export async function apiRequestWithETag<T>(path: string, etag?: string | null): Promise<ETagResult<T>> {
	const options: RequestOptions = etag ? { headers: { "If-None-Match": etag } } : {};

	let response = await performRequest(path, options);

	if (response.status === 401 && authAdapter) {
		const newToken = await ensureFreshAccessToken();
		if (newToken) {
			response = await performRequest(path, options);
		}
	}

	const nextETag = response.headers.get("etag");

	if (response.status === 304) {
		return { notModified: true, data: null, etag: etag ?? nextETag };
	}

	const isJson = response.headers.get("content-type")?.includes("application/json");
	const payload = isJson ? await response.json() : undefined;

	if (!response.ok) {
		if (payload?.error) {
			throw new ApiError(response.status, payload.error);
		}
		throw new ApiError(response.status, { code: "INTERNAL", message: "Error de red o del servidor" });
	}

	return { notModified: false, data: payload as T, etag: nextETag };
}

// GET /api/health vive fuera de /api/v1 y no pide autenticación (docs/APP_MOVIL.md §3):
// sirve solo para comprobar conectividad, no para nada del contrato de negocio.
export async function checkApiHealth(): Promise<{ status: string }> {
	const url = process.env.EXPO_PUBLIC_API_URL;
	if (!url) {
		throw new Error("Falta EXPO_PUBLIC_API_URL");
	}
	const response = await fetch(`${url}/api/health`);
	if (!response.ok) {
		throw new Error(`El servidor respondió ${response.status}`);
	}
	return response.json();
}
