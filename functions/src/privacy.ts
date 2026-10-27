// src/privacy.ts – HTTP endpoints for legal docs
import { onRequest } from 'firebase-functions/v2/https';

// Static content – in a real app you might load from markdown files
const PRIVACY_POLICY = `
# Privacy Policy

At EnvShare we protect your environment variables and privacy. We collect only the data described in our UI, store secrets server‑side, and never expose them to the client. For full details see the in‑app Privacy Policy page.
`;

const TERMS_OF_SERVICE = `
# Terms of Service

By using EnvShare you agree to the following terms. You must not abuse the service, you must comply with applicable law, and you retain ownership of your data. For full details see the in‑app Terms of Service page.
`;

/** GET /privacy – returns the privacy policy */
export const privacy = onRequest((req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.status(200).send({ policy: PRIVACY_POLICY });
});

/** GET /tos – returns the terms of service */
export const tos = onRequest((req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.status(200).send({ terms: TERMS_OF_SERVICE });
});
