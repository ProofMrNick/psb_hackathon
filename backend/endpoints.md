# Backend API

The source of truth is [`openapi.yaml`](./openapi.yaml). With the backend running, the same file is available at `GET /api/openapi.yaml`.

Canonical application actions:

- `POST /api/applications` — create, enrich and score a client application;
- `POST /api/applications/{localId}/clarify` — provide missing data and restart scoring;
- `POST /api/applications/{localId}/accept` — accept an approved offer;
- `POST /api/applications/{localId}/decline` — decline an offer;
- `GET /api/bank/applications` — filtered employee queue;
- `GET /api/bank/applications/{globalId}` — complete employee card;
- `POST /api/bank/applications/{globalId}/decision` — employee/technical-user decision;
- `POST /api/bank/applications/{globalId}/rescore` — manual scoring restart.

See [`../api.http`](../api.http) for an executable end-to-end example that captures IDs from responses.
