---
name: top-products-site-optimizer
description: |
  A GitHub Copilot agent designed to maintain and improve the product‑guide sites in the SC‑Connections repository.
  The agent ensures that each generated niche page reflects the new “Top Products/Best” naming convention,
  rather than “Top 10,” and that only high‑quality, non‑duplicate products are included.
  It updates templates, generator scripts, and per‑site HTML files to:
  – rewrite titles, meta tags, and JSON‑LD names/descriptions without a hardcoded product count;
  – enforce a premium brand whitelist and deduplicate color variants or bundles;
  – insert affiliate disclosures and up‑to‑date build timestamps;
  – enhance the hero section and comparison tables for usability and mobile responsiveness;
  – add related‑guides links and a unified footer for better navigation and trust.
  The agent also updates the site hub page to list niches by category and provide a clear overview of all guides.
---

# My Agent

This agent monitors and regenerates the niche product‑guide pages in the **Top‑10** repository.
On each run it performs the following steps:

- **Adjust naming and metadata:** replaces any “Top 10” phrasing in titles, meta descriptions, Open‑Graph/Twitter tags,
  and JSON‑LD structured data with “Best” or “Top Products” to avoid promising a fixed product count.
- **Template and script updates:** ensures the shared templates (`template.html`, `product-template.html`, etc.)
  and generator scripts output modern, mobile‑friendly pages with a strong hero section, clear call‑to‑action,
  and correct affiliate disclosure.
- **Product curation:** filters product lists to include only premium brands (e.g. Apple, Sony, Bose, Sennheiser),
  removes duplicates (variant colors or bundles), verifies that each product has complete data (ASIN, image, price, rating, reviews),
  and shortens overly long Amazon titles to clean product names.
- **SEO and UX improvements:** adds or updates canonical tags, meta descriptions, and FAQ/buyer’s guide content,
  ensures comparison tables are consistent and scrollable on mobile, and inserts a “More Guides” section linking to related niches.
- **Hub page generation:** (re)builds a main index page that groups all niches by category and links to each guide
  with a concise description and a unified look.
- **Trust and compliance:** inserts an affiliate disclosure (“As an Amazon Associate we earn from qualifying purchases”),
  a brief About/Contact footer, and consistent branding (logo, favicon) across all pages.

By performing these tasks automatically, the agent keeps all current and future niche sites polished, professional, and
aligned with the new “Top Products” branding without you having to manually edit each page.
