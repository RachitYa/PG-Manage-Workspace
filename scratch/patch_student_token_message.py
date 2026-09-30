import re

file_path = 'febebo-app/src/screens/Chat.jsx'
with open(file_path, 'r') as f:
    content = f.read()

# The original text format
old_text_line = "        text: `💰 Token Payment Logged\\nToken Paid: ₹${tokenAmount}\\nRent: ₹${rent}/month\\nSecurity: ₹${security}\\nTotal First Month: ₹${totalAmt}\\n\\nPlease verify and allot my room.`,"

new_text_lines = """        text: `💰 Token Payment Logged\\n` +
              `Token Paid: ₹${tokenAmount}\\n` +
              `Remaining Amount: ₹${remainingAmount}\\n` +
              `Payment Mode: ${paymentMode}\\n` +
              (paymentMode === 'Online' && transactionId ? `Transaction ID: ${transactionId}\\n` : '') +
              (receivedBy ? `Received By: ${receivedBy}\\n` : '') +
              `\\n---\\n` +
              `Rent: ₹${rent}/month\\n` +
              `Security: ₹${security}\\n` +
              `Total First Month: ₹${totalAmt}\\n\\n` +
              `Please verify and allot my room.`,"""

if old_text_line in content:
    content = content.replace(old_text_line, new_text_lines)
    with open(file_path, 'w') as f:
        f.write(content)
    print("Successfully updated token payment message format!")
else:
    print("Could not find the target string to replace.")
