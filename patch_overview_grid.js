const fs = require('fs');
const file = '/Users/shreyassingh/Downloads/PG MANAGE @/febebo-staff/src/pages/StaffApp.jsx';
let content = fs.readFileSync(file, 'utf8');

// The array contains: Staff On Duty, Open Tickets, Vacant Rooms, Pending POs, New Leads, Mess Covers.
// We need to remove Open Tickets.
const openTicketsRegex = /\{label:'Open Tickets', value: String.*?sub:'Across all depts'\},/g;
content = content.replace(openTicketsRegex, "");

fs.writeFileSync(file, content, 'utf8');
