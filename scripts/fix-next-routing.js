const fs = require('fs');
const path = require('path');

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (p.endsWith('.tsx')) out.push(p);
  }
  return out;
}

const roots = [
  path.join(__dirname, '..', 'src', 'app'),
  path.join(__dirname, '..', 'src', 'components'),
];

const files = roots.flatMap((r) => (fs.existsSync(r) ? walk(r) : []));

for (const file of files) {
  let s = fs.readFileSync(file, 'utf8');
  const old = s;

  s = s.replace(
    /import\s*\{\s*Link\s+as\s+RouterLink\s*,\s*useNavigate\s*\}\s*from\s*'next\/navigation';/g,
    "import NextLink from 'next/link';\nimport { useRouter } from 'next/navigation';",
  );

  s = s.replace(
    /import\s*\{\s*useNavigate\s*,\s*Link\s+as\s+RouterLink\s*\}\s*from\s*'next\/navigation';/g,
    "import NextLink from 'next/link';\nimport { useRouter } from 'next/navigation';",
  );

  s = s.replace(
    /import\s*\{\s*useParams\s*,\s*Link\s+as\s+RouterLink\s*\}\s*from\s*'next\/navigation';/g,
    "import NextLink from 'next/link';\nimport { useParams } from 'next/navigation';",
  );

  s = s.replace(
    /import\s*\{\s*Link\s+as\s+RouterLink\s*,\s*useParams\s*\}\s*from\s*'next\/navigation';/g,
    "import NextLink from 'next/link';\nimport { useParams } from 'next/navigation';",
  );

  s = s.replace(
    /import\s*\{\s*Link\s+as\s+RouterLink\s*\}\s*from\s*'next\/navigation';/g,
    "import NextLink from 'next/link';",
  );

  s = s.replace(/useNavigate\(/g, 'useRouter(');
  s = s.replace(/\bnavigate\(/g, 'router.push(');
  s = s.replace(/as=\{RouterLink\}/g, 'as={NextLink}');
  s = s.replace(/\bto=/g, 'href=');

  if (s !== old) {
    fs.writeFileSync(file, s, 'utf8');
    console.log(path.relative(path.join(__dirname, '..'), file));
  }
}
