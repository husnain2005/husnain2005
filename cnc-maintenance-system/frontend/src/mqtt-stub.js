// Stub to prevent mqtt client from being bundled in the browser.
// The frontend uses REST polling, not direct MQTT WebSocket connections.
const noop = () => {};
const fakeClient = { on: noop, subscribe: noop, publish: noop, end: noop, unsubscribe: noop };
export const connect = () => fakeClient;
export default { connect: () => fakeClient };
