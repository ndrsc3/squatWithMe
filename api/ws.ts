import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';

const server = createServer();
console.debug('🔵 [WebSocket] Server created');

const wss = new WebSocketServer({
    server,
    path: '/api/ws',
    clientTracking: true,
});
console.debug('🔵 [WebSocket] WebSocket server initialized with config:', {
    path: '/api/ws',
    clientTracking: true,
});

server.on('upgrade', (request) => {
    console.debug('🔵 [WebSocket] Upgrade request received:', {
        url: request.url,
        headers: request.headers,
    });
});

declare global {
    // eslint-disable-next-line no-var
    var wss: WebSocketServer | undefined;
}
global.wss = wss;

wss.on('listening', () => {
    console.debug('🔵 [WebSocket] Server is listening');
});

wss.on('connection', (ws, req) => {
    console.debug('🔵 [WebSocket] New connection from:', req.socket.remoteAddress);
    (ws as WebSocket & { isAlive: boolean }).isAlive = true;

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message.toString()) as { type: string; userId?: string };
            console.debug('🔵 [WebSocket] Received message:', data);
            handleWebSocketMessage(ws, data);
        } catch (error) {
            console.error('🔴 [WebSocket] Invalid message format:', error);
            console.error('🔴 [WebSocket] Raw message:', message.toString());
        }
    });

    ws.on('pong', () => {
        console.debug('🔵 [WebSocket] Received pong from client');
        (ws as WebSocket & { isAlive: boolean }).isAlive = true;
    });

    ws.on('error', (error) => {
        console.error('🔴 [WebSocket] Client error:', error);
    });

    ws.on('close', (code, reason) => {
        console.debug('🔵 [WebSocket] Client disconnected:', { code, reason: reason.toString() });
    });
});

function handleWebSocketMessage(ws: WebSocket, data: { type: string; userId?: string }) {
    console.debug('🔵 [WebSocket] Handling message:', data);
    switch (data.type) {
        case 'update':
            broadcastUpdate(data);
            break;
        case 'userRemoved':
            broadcastUserRemoval(data.userId ?? '');
            break;
        default:
            console.warn('🟡 [WebSocket] Unknown message type:', data.type);
    }
}

function broadcastUpdate(data: unknown) {
    console.debug('🔵 [WebSocket] Broadcasting update to', wss.clients.size, 'clients');
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}

function broadcastUserRemoval(userId: string) {
    console.debug('🔵 [WebSocket] Broadcasting user removal:', userId);
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'userRemoved', userId }));
        }
    });
}

const PING_INTERVAL = 30000;
setInterval(() => {
    console.debug('🔵 [WebSocket] Performing health check on', wss.clients.size, 'clients');
    wss.clients.forEach((ws) => {
        const alive = ws as WebSocket & { isAlive: boolean };
        if (alive.isAlive === false) {
            console.warn('🟡 [WebSocket] Terminating inactive client');
            return ws.terminate();
        }
        alive.isAlive = false;
        ws.ping();
    });
}, PING_INTERVAL);

export default server;
