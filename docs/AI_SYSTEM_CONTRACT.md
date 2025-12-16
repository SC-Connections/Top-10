# AI System Contract – SC Connections Auto-Niche Generator

## Purpose
This document defines the long-term architectural intent and business rules for the SC Connections auto-niche site generator.
It exists to protect revenue, prevent regressions, and ensure consistent AI-assisted development over time.

## System Overview
- CSV-driven niche configuration
- Automated data ingestion from Amazon product APIs
- Static site generation per niche
- Automated deployment via GitHub Actions to GitHub Pages
- Monetization via Amazon Associates

## Non-Negotiable Rules
- Live sites are production assets and must not be broken
- Generic or unbranded products are never published
- All products must include valid images and affiliate links
- No niche-specific hardcoding is allowed

## Quality Standards
- SEO-safe HTML structure
- Clean internal linking
- No duplicate products or pages
- Graceful failure when data is insufficient

## Change Philosophy
- Prefer scalable, future-proof solutions
- Avoid quick fixes that increase long-term maintenance
- All changes must benefit every current and future niche

## AI Usage Policy
- AI agents must follow `.github/copilot-instructions.md` as the authoritative source
- Any deviation requires explicit human approval
