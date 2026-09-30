import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';

const code = fs.readFileSync('src/firebase.js', 'utf8');
const match = code.match(/firebaseConfig = (\{[\s\S]*?\});/);
if (match) {
  const cfg = eval('(' + match[1] + ')');
  const app = initializeApp(cfg);
  const db = getFirestore(app);
  const snap = await getDocs(collection(db, 'pg_owners'));
  let out = [];
  snap.forEach(d => {
    let data = d.data();
    out.push({
      id: d.id,
      images: data.images ? data.images.length : 0,
      image: !!data.image,
      pgName: data.pgName
    });
  });
  console.log(JSON.stringify(out, null, 2));
} else {
  console.log('no match');
}
