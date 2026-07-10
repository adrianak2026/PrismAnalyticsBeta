# Data Processing Agreement (DPA) — Template

> Use this if you host PrismAnalytics for clients and act as processor.

**Between:**
Controller: [Client Name] (“Controller”)
Processor: [Your Company] (“Processor”) operating PrismAnalytics self-hosted on Cloudflare.

## 1. Subject & Duration

Processor processes anonymized web analytics data on behalf of Controller for duration of service.

## 2. Nature & Purpose

Simple web analytics: page paths, referrers, countries, device/browser/OS labels, UTMs, custom non-PII events.

## 3. Types of Personal Data

**None by design.** No IP, no UA, no cookies, no identifiers that are personal data. Only salted daily hashes that rotate every 24h and cannot identify beyond 24h. If Controller puts PII into custom event_data, Controller is responsible.

## 4. Obligations

Processor:
- Processes only on documented instructions
- Ensures confidentiality (PBKDF2, JWT, rate limiting)
- Does not engage subprocessors (data stays in Controller's Cloudflare account or Processor's if hosting on behalf)
- Assists with data subject requests (deletion via dashboard)
- Deletes data on termination per retention settings

## 5. Security Measures

- Encryption in transit (TLS)
- Encryption at rest (D1, R2)
- Access control (JWT + session revocation)
- Audit logging
- No raw IP storage, daily salted hashing

## 6. Subprocessors

None (or Cloudflare as infra subprocessor with DPA https://www.cloudflare.com/dpa).

## 7. International Transfers

Data stays in Cloudflare region chosen.

## 8. Audit

Controller may audit via code review (open-source) and dashboard logs.

Signed:
Controller ___________________ Date ______
Processor ___________________ Date ______
