# Device WebSocket protocol

`v1/` is the first versioned device contract. Device-to-server messages include
`protocol_version: 1`; during the Sprint 1-to-2 transition firmware and the
simulator also accept legacy server commands without that field.

The browser WebSocket is a separate server-to-browser interface and is not
defined here. MQTT is not part of v1 and is intentionally deferred.

Run fixture validation from the repository root:

```bash
python3 -m unittest discover contracts/websocket/tests
```
