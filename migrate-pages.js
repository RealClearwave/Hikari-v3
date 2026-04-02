const fs = require('fs');
const path = require('path');

const baseDir = __dirname;
const pages = {
  'Home/index.tsx': 'page.tsx',
  'Problem/index.tsx': 'problem/page.tsx',
  'Problem/Detail.tsx': 'problem/[id]/page.tsx',
  'Problem/Submit.tsx': 'problem/submit/page.tsx',
  'Contest/index.tsx': 'contest/page.tsx',
  'Contest/Detail.tsx': 'contest/[id]/page.tsx',
  'Discuss/index.tsx': 'discuss/page.tsx',
  'Discuss/Detail.tsx': 'discuss/[id]/page.tsx',
  'Record/index.tsx': 'record/page.tsx',
  'Record/Detail.tsx': 'record/[id]/page.tsx',
  'User/Login.tsx': 'user/login/page.tsx',
  'User/Register.tsx': 'user/register/page.tsx',
  'User/Profile.tsx': 'user/profile/page.tsx',
  'User/index.tsx': 'user/page.tsx',
  'Blog/index.tsx': 'blog/page.tsx',
  'Admin/index.tsx': 'admin/page.tsx'
};

Object.keys(pages).forEach(k => {
  const pSrc = path.join(baseDir, '../ojv3/frontend/src/pages', k);
  const pDest = path.join(baseDir, 'src/app', pages[k]);
  
  if (fs.existsSync(pSrc)) {
    const pDestDir = path.dirname(pDest);
    if (!fs.existsSync(pDestDir)) {
      fs.mkdirSync(pDestDir, { recursive: true });
    }
    
    let content = fs.readFileSync(pSrc, 'utf-8');
    // For React components rendered on the client in the App Router 
    content = '"use client";\n\n' + content;
    
    // Quick fix for some likely router imports. In actual migration we'd replace the imports precisely.
    content = content.replace(/react-router-dom/g, 'next/navigation');
    
    fs.writeFileSync(pDest, content, 'utf-8');
  }
});

console.log("Pages migrated successfully");
