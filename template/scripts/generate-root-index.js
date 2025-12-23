const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const entries = fs.readdirSync(root, { withFileTypes: true });

const nicheFolders = entries
  .filter(e =>
    e.isDirectory() &&
    !e.name.startsWith('.') &&
    e.name !== 'templates' &&
    e.name !== '.github' &&
    e.name !== 'scripts' &&
    e.name !== 'node_modules' &&
    e.name !== 'data'  // Exclude data directory
  )
  .map(e => e.name);

let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Top 10 Niche Sites – SC Connections</title>
  <link rel="stylesheet" href="templates/global.css">
  <style>
    .page {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    .niche-list {
      background-color: var(--background);
      padding: 4rem 0;
      flex: 1;
    }
    .niche-list .container {
      max-width: 800px;
      margin: 0 auto;
      padding: 0 20px;
    }
    .niche-list ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .niche-list li {
      margin-bottom: 1rem;
    }
    .niche-list a {
      display: block;
      padding: 1.5rem;
      background: var(--background-alt);
      border-radius: var(--border-radius);
      border-left: 4px solid var(--primary-color);
      text-decoration: none;
      color: var(--text-primary);
      font-size: 1.25rem;
      font-weight: 600;
      transition: all 0.3s;
      text-transform: capitalize;
    }
    .niche-list a:hover {
      background: white;
      box-shadow: var(--shadow-md);
      transform: translateX(8px);
    }
    .niche-list p {
      text-align: center;
      font-size: 1.125rem;
      color: var(--text-secondary);
      padding: 2rem;
    }
  </style>
</head>
<body>
  <main class="page">
    <header class="hero">
      <div class="container">
        <h1>Top 10 Niche Product Review Sites</h1>
        <p>Select a niche below:</p>
      </div>
    </header>
    <section class="niche-list">
      <div class="container">`;

if (nicheFolders.length === 0) {
  html += `
        <p>No niche sites generated yet.</p>`;
} else {
  html += `
        <ul>`;
  nicheFolders.forEach(folder => {
    // Format folder name: replace hyphens with spaces and capitalize
    const displayName = folder.replace(/-/g, ' ');
    html += `
          <li><a href="${folder}/">${displayName}</a></li>`;
  });
  html += `
        </ul>`;
}

html += `
      </div>
    </section>
  </main>
</body>
</html>
`;

fs.writeFileSync(path.join(root, 'index.html'), html, 'utf8');
console.log('Root index.html generated successfully.');
