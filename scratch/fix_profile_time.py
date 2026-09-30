import re

with open('Febebo-admin/src/pages/StaffProfile.jsx', 'r') as f:
    content = f.read()

# Helper function definition
helper_fn = """
  const formatTime = (timeVal) => {
    if (!timeVal) return 'N/A';
    if (typeof timeVal === 'string' && (timeVal.includes('AM') || timeVal.includes('PM') || !timeVal.includes('T'))) {
      return timeVal;
    }
    return new Date(timeVal).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  };
"""

# Insert the helper function near the top of the component
content = re.sub(r'(const handleDayClick =)', helper_fn + r'\n  \1', content)

# Replace clockIn, clockOut, restStart, restEnd parsing
content = re.sub(
    r'\{selectedDayLog\.clockIn \? new Date\(selectedDayLog\.clockIn\)\.toLocaleTimeString\(\[\], \{hour: \'2-digit\', minute:\'2-digit\'\}\) : \'N/A\'\}',
    r'{formatTime(selectedDayLog.clockIn)}',
    content
)
content = re.sub(
    r'\{selectedDayLog\.clockOut \? new Date\(selectedDayLog\.clockOut\)\.toLocaleTimeString\(\[\], \{hour: \'2-digit\', minute:\'2-digit\'\}\) : \'N/A\'\}',
    r'{formatTime(selectedDayLog.clockOut)}',
    content
)
content = re.sub(
    r'\{selectedDayLog\.restStart \? new Date\(selectedDayLog\.restStart\)\.toLocaleTimeString\(\[\], \{hour: \'2-digit\', minute:\'2-digit\'\}\) : \'None\'\}',
    r'{formatTime(selectedDayLog.restStart)}',
    content
)
content = re.sub(
    r'\{selectedDayLog\.restEnd \? new Date\(selectedDayLog\.restEnd\)\.toLocaleTimeString\(\[\], \{hour: \'2-digit\', minute:\'2-digit\'\}\) : \'None\'\}',
    r'{formatTime(selectedDayLog.restEnd)}',
    content
)

# Fix totalHoursWorked to hoursWorked fallback
content = re.sub(
    r'\{selectedDayLog\.totalHoursWorked \? `\$\{selectedDayLog\.totalHoursWorked\.toFixed\(1\)\} hrs` : \'N/A\'\}',
    r'{selectedDayLog.totalHoursWorked ? `${selectedDayLog.totalHoursWorked.toFixed(1)} hrs` : (selectedDayLog.hoursWorked ? `${selectedDayLog.hoursWorked} hrs` : \'N/A\')}',
    content
)

with open('Febebo-admin/src/pages/StaffProfile.jsx', 'w') as f:
    f.write(content)
