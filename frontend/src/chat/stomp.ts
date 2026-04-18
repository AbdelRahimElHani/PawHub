import { Client, IMessage } from "@stomp/stompjs";
import SockJS from "sockjs-client";

export function createStompClient(
  token: string,
  onConnect: (c: Client) => void,
  onDisconnect: () => void,
) {
  const client = new Client({
    reconnectDelay: 4000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    webSocketFactory: () =>
      new SockJS(`/ws?access_token=${encodeURIComponent(token)}`) as unknown as WebSocket,
    connectHeaders: { access_token: token },
    debug: () => undefined,
    onConnect: () => onConnect(client),
    onDisconnect,
    onStompError: (frame) => console.error("STOMP error", frame.headers["message"], frame.body),
  });
  return client;
}

export function subscribeThread(client: Client, threadId: number, handler: (body: string) => void) {
  return client.subscribe(`/topic/threads.${threadId}`, (message: IMessage) => {
    handler(message.body);
  });
}

export function sendChatMessage(client: Client, threadId: number, body: string) {
  client.publish({
    destination: "/app/chat.send",
    body: JSON.stringify({ threadId, body }),
  });
}
