const fs = require('fs');
const file = "/Users/shreyassingh/Downloads/PG MANAGE @/febebo-staff/src/pages/StaffApp.jsx";
let content = fs.readFileSync(file, 'utf8');

// 1. Remove the menu button from the inner header
const innerHeaderStart = `<div style={{display:'flex',alignItems:'center',gap:10,padding:'0 16px',height:58,background:'#fff',borderBottom: '1px solid #e2e8f0',position:'sticky',top:0,zIndex:50,boxShadow: '0 4px 16px rgba(15,23,42,0.05)'}}>
          <button onClick={()=>setSidebar(true)} style={{background:'#fff',border: '1px solid #e2e8f0',borderRadius:10,width:36,height:36,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0,boxShadow: '0 2px 8px rgba(15,23,42,0.04)'}}>
            <span className="material-symbols-outlined" style={{fontSize:20,color:'#000'}}>menu</span>
          </button>`;

const innerHeaderReplacement = `<div style={{display:'flex',alignItems:'center',gap:10,padding:'0 16px',height:58,background:'#fff',borderBottom: '1px solid #e2e8f0',position:'sticky',top:0,zIndex:50,boxShadow: '0 4px 16px rgba(15,23,42,0.05)'}}>`;

content = content.replace(innerHeaderStart, innerHeaderReplacement);

fs.writeFileSync(file, content);
