const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'generated', 'prisma');
const dest = path.join(__dirname, '..', 'dist', 'generated', 'prisma');

fs.rmSync(dest, { recursive: true, force: true });
fs.cpSync(src, dest, { recursive: true });
