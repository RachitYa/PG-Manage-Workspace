const fs = require('fs');

let code = fs.readFileSync('/Users/shreyassingh/Downloads/PG MANAGE @/Febebo-admin/src/pages/ManageRooms.jsx', 'utf8');

const targetStr = `    if (rooms.some(r => String(r.roomNo).trim() === String(roomNo).trim())) {
      setErrorMsg(\`Room No. \${roomNo} is already registered!\`);
      return;
    }`;

const replacementStr = `    if (rooms.some(r => String(r.roomNo).trim() === String(roomNo).trim())) {
      setErrorMsg(\`Room No. \${roomNo} is already registered!\`);
      return;
    }

    const existingSeats = rooms.reduce((acc, r) => acc + (parseInt(r.beds || r.roomBeds) || 0), 0);
    const addingSeats = parseInt(seaterType) || 1;
    if (existingSeats + addingSeats > pgStats.totalSeats) {
        setErrorMsg(\`Cannot add room! Total seats will exceed registered capacity (\${pgStats.totalSeats}). Currently configured seats: \${existingSeats}.\`);
        return;
    }`;

code = code.replace(targetStr, replacementStr);
fs.writeFileSync('/Users/shreyassingh/Downloads/PG MANAGE @/Febebo-admin/src/pages/ManageRooms.jsx', code);
