<p align="center">
  <img src="./banner.png" alt="Cube Pets Office banner" width="100%" />
</p>

<h1 align="center">Cube Pets Office</h1>

<p align="center">
  A 3D multi-agent orchestration playground where one directive becomes coordinated work across 18 agents.
</p>

<p align="center">
  <img alt="status" src="https://img.shields.io/badge/status-active%20prototype-0ea5e9" />
  <img alt="agents" src="https://img.shields.io/badge/agents-18-22c55e" />
  <img alt="workflow" src="https://img.shields.io/badge/workflow-10%20stages-f97316" />
  <img alt="license" src="https://img.shields.io/badge/license-MIT-111827" />
</p>

## Overview

Cube Pets Office started as a visual demo and has grown into a working multi-agent system with:

- a 3D office scene that renders all 18 agents
- a 10-stage workflow pipeline
- real-time WebSocket updates for agent status and message flow
- per-agent memory, review, revision, verify, and evolution loops
- a single `.env` driven AI configuration shared by chat and workflow execution

The core idea is simple:

> one user directive -> CEO routing -> department planning -> worker execution -> review -> audit -> revision -> verify -> summary -> feedback -> evolution

## What Works Today

- 18 agents are seeded and loaded into the system
- 18 visual agent slots are rendered in the 3D scene
- workflow stages run end-to-end through:
  `direction -> planning -> execution -> review -> meta_audit -> revision -> verify -> summary -> feedback -> evolution`
- the frontend shows:
  - directive view
  - org view
  - workflow progress view
  - review view
  - memory view
  - history view
- message flow particles and stage-linked agent animations are implemented
- recent memory injection is implemented
- historical workflow summaries are searchable
- persona evolution is implemented through the `soul_md` field in storage
- chat and workflow now read the same server-side AI config

## What Is Not Done Yet

This repository is open-sourced as an active prototype, not as a finished framework.

- strict filesystem isolation is not enforced yet
- mid-term memory is keyword-based, not vector retrieval
- long-term memory evolves in stored `soul_md`, not file-based `SOUL.md`
- heartbeat / scheduled autonomous reporting is not implemented yet
- some historical docs still contain legacy notes and cleanup debt

## Tech Stack

- Frontend: React 19, Vite, TypeScript, Zustand
- 3D: Three.js, React Three Fiber, Drei
- Backend: Express, Socket.IO, TypeScript
- AI access: OpenAI-compatible APIs
- Storage: local JSON database plus per-agent runtime workspace files

## Project Structure

```text
client/   frontend app, 3D scene, workflow panel, chat panel
server/   API routes, workflow engine, agent registry, memory, sockets
shared/   shared utilities and types
data/     local runtime state and agent workspace artifacts
scripts/  local development helpers
```

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Create `.env`

Copy `.env.example` to `.env` and fill in your provider settings.

Minimal example:

```dotenv
PORT=3001
NODE_ENV=development

LLM_API_KEY=your_api_key_here
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-5.4
LLM_WIRE_API=responses
LLM_REASONING_EFFORT=high
LLM_TIMEOUT_MS=45000
```

### 3. Start frontend and backend together

```bash
npm run dev:all
```

Default local URLs:

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:3001/api`

You can also run them separately:

```bash
npm run dev
npm run dev:server
```

### 4. Type-check

```bash
npm run check
```

## Runtime Data

The app writes local runtime artifacts under `data/`, including:

- `data/database.json`
- `data/agents/*/sessions/`
- `data/agents/*/memory/`
- `data/agents/*/reports/`

These files are local runtime state, not source code. They are intentionally ignored for open-source publishing.

## API Surface

Main routes currently exposed by the server:

- `POST /api/workflows` - start a workflow
- `GET /api/workflows` - list workflows
- `GET /api/workflows/:id` - fetch workflow details
- `GET /api/agents` - list agents
- `GET /api/agents/:id/memory/recent` - recent memory entries
- `GET /api/agents/:id/memory/search` - search historical summaries
- `GET /api/config/ai` - inspect current AI config source and values
- `POST /api/chat` - unified server-side chat endpoint

## Open Source Notes

- License: MIT
- This repo is being shared in its current working state
- The public version excludes local memory/session artifacts and local config snapshots
- If you fork it, rotate your own API keys and keep `.env` local

## Roadmap

See `ROADMAP.md` for the more detailed implementation roadmap and the current "done vs not done" breakdown.
