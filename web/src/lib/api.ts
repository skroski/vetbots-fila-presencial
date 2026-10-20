// Cliente da API local (mesma origem do servidor Node).
const PIN_KEY = 'fila_admin_pin';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export const getAdminPin = () => {
  try {
    return sessionStorage.getItem(PIN_KEY) || '';
  } catch {
    return '';
  }
};

export const setAdminPin = (pin: string) => {
  try {
    if (pin) sessionStorage.setItem(PIN_KEY, pin);
    else sessionStorage.removeItem(PIN_KEY);
  } catch {
    /* modo privativo: o PIN só vale até recarregar */
  }
};

function headers(json: boolean): Record<string, string> {
  const h: Record<string, string> = {};
  if (json) h['content-type'] = 'application/json';
  const pin = getAdminPin();
  if (pin) h['x-admin-pin'] = pin;
  return h;
}

async function lerErro(res: Response): Promise<ApiError> {
  let msg = `Erro ${res.status}`;
  try {
    const j = await res.json();
    if (j?.erro) msg = j.erro;
  } catch {
    /* corpo vazio */
  }
  return new ApiError(res.status, msg);
}

export async function api<T = unknown>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method,
      headers: headers(body !== undefined),
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'Sem conexão com o servidor da clínica.');
  }
  if (!res.ok) throw await lerErro(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// Envio de arquivo (vídeo/logo) como corpo bruto, com barra de progresso.
export function enviarArquivo<T = unknown>(
  path: string,
  file: File,
  onProgress?: (pct: number) => void,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', `${path}${path.includes('?') ? '&' : '?'}nome=${encodeURIComponent(file.name)}`);
    const pin = getAdminPin();
    if (pin) xhr.setRequestHeader('x-admin-pin', pin);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onerror = () => reject(new ApiError(0, 'Falha na conexão durante o envio.'));
    xhr.onload = () => {
      let corpo: { erro?: string } | null = null;
      try {
        corpo = JSON.parse(xhr.responseText);
      } catch {
        /* sem corpo */
      }
      if (xhr.status >= 200 && xhr.status < 300) resolve(corpo as T);
      else reject(new ApiError(xhr.status, corpo?.erro || `Erro ${xhr.status}`));
    };
    xhr.send(file);
  });
}
