export const isDemo = import.meta.env.VITE_DEMO_MODE === 'true';

export async function request(path, method = 'GET', body) {
    if (isDemo) {
        const { demoRequest } = await import('./demo');
        return demoRequest(path, method, body);
}

let response;

try {
    response = await fetch(`${import.meta.env.VITE_API_URL || '/api'}${path}`, {
        method,
        credentials: 'include',
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined
    });
} catch {
    throw new Error(`Não foi possível conectar à SerFit.
        Verifique sua conexão e tente novamente.`);
}

if (!response.headers.get('content-type')?.includes('application/json')) {
    throw new Error(`O serviço da SerFit está indisponível.
        Tente novamente em instantes.`);
}

const data = await response.json();

if (!response.ok) {
    const error = new Error(data.message || `Não foi possível concluir esta ação.`);
    error.status = response.status;
    
    if (response.status === 401 && !path.startsWith('/auth/')) {
        window.dispatchEvent(new Event('serfit-session-expired'));
    }
    
    throw error;
}

return data;
}