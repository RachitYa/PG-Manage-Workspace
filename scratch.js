const fs = require('fs');
const file = "/Users/shreyassingh/Downloads/PG MANAGE @/Febebo-admin/src/pages/Chat.jsx";
let content = fs.readFileSync(file, 'utf8');

const sendRoomDetailsFunc = `
  const sendRoomDetails = async (roomId) => {
    setActionLoading('sending_details');
    const room = availableRooms.find(r => r.id === roomId);
    if (!room) {
      setActionLoading(null);
      return;
    }

    try {
      const roomDesc = \`Room No: \${room.roomNo}
Type: \${room.roomBeds} Seater
Beds: \${room.bedNumbers || 'N/A'}\`;
      
      const payload = {
        senderId: user.uid,
        senderName: user.name || 'Admin',
        text: \`Here are the details for Room \${room.roomNo}:\\n\\n\${roomDesc}\`,
        timestamp: new Date().toISOString(),
        read: false
      };
      
      if (room.image) {
        payload.imageUrl = room.image;
        payload.imageName = \`Room_\${room.roomNo}_image\`;
      }

      const chatId = user.uid < activeContact.id ? \`\${user.uid}_\${activeContact.id}\` : \`\${activeContact.id}_\${user.uid}\`;
      await addDoc(collection(db, 'chats', chatId, 'messages'), payload);
      
      await updateDoc(doc(db, 'chats', chatId), {
        lastMessage: \`Sent details for Room \${room.roomNo}\`,
        lastTimestamp: new Date().toISOString()
      });
      
      setShowRoomDetailsModal(false);
      setSelectedRoomId('');
      if (bottomRef.current) {
        bottomRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    } catch (error) {
      console.error('Error sending room details:', error);
      alert('Failed to send room details');
    }
    setActionLoading(null);
  };
`;

content = content.replace("const openAllotModal = async () => {", sendRoomDetailsFunc + "\n  const openAllotModal = async () => {");
fs.writeFileSync(file, content);
