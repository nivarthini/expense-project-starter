# Expense & Income SaaS Architecture

## Overview

This project is a multi-tenant expense and income management system with a Next.js App Router frontend, Express API, Prisma ORM, and PostgreSQL.

## Tenant Isolation

Every authenticated access token carries `userId`, `role`, and `orgId`. Backend routes use authentication middleware before protected controllers, and transaction repository queries always include `orgId` in `where` clauses. Mutations use `id + orgId` filters so a valid transaction id from another organization cannot be updated or deleted.

The database schema uses foreign keys from `User` and `Transaction` to `Organization`. Query-heavy fields are indexed, including `orgId`, `createdAt`, `(orgId, createdAt)`, and `(orgId, type, createdAt)`.

## Authentication

The API issues a short-lived access token and a rotating refresh token. The refresh token is stored as a hashed value in PostgreSQL and sent to the browser as an HTTP-only cookie. On refresh, the old token must match the stored hash, then a new refresh token is issued and persisted. If an old refresh token is reused after rotation, the stored token is cleared to force re-authentication.

The frontend keeps the access token in memory only. It does not store access or refresh tokens in `localStorage`. Axios sends credentials for the HTTP-only refresh cookie and retries one failed request after a successful refresh.

## Authorization

Roles are enforced in API middleware. All authenticated users can read dashboard/list/export data for their own organization. `ADMIN` and `ACCOUNTANT` can create, update, and delete transactions.

## Validation And Errors

Controllers validate request payloads and query parameters with Zod before business logic runs. The centralized error middleware formats validation errors and logs server errors through Pino.

## Financial Consistency

Transaction create, update, delete, and list/count operations use Prisma transactions so financial operations do not partially complete under contention or network interruption.

## Performance

List endpoints require pagination with bounded limits. Dashboard totals use database aggregation. CSV export is batched with cursor pagination so the API does not load the full dataset into memory.

## Deployment

Frontend: deploy `frontend` to Vercel with `NEXT_PUBLIC_API_URL` pointing to the Render API URL.

Backend: deploy `backend` to Render with `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `FRONTEND_URL`, and `NODE_ENV=production`.

Database: use managed PostgreSQL, such as Supabase or RDS, with connection pooling enabled. For Prisma, use the pooled database URL when available.

## CI/CD

GitHub Actions runs on push and pull request. The pipeline installs dependencies, validates Prisma schema, lints, builds, and runs test commands for both backend and frontend. Any failed step fails the pipeline.
