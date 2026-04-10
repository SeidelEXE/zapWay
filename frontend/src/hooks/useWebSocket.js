export default function useWebSocket(url, onMessage) {
  let ws = null;

  const connect = () => {
    ws = new WebSocket(url);

    ws.onopen = () => {
      console.log('WebSocket connected');
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      onMessage?.(data);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
    };
  };

  const disconnect = () => {
    if (ws) {
      ws.close();
    }
  };

  const send = (data) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  };

  return { connect, disconnect, send };
}
