import re

with open('Febebo-admin/src/pages/AlreadyResidence.jsx', 'r') as f:
    content = f.read()

# Change saving logic in users collection
user_old = r"""      // Save to users collection directly as Current User!
      await setDoc(doc(db, 'users', newUser.uid), {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        role: 'customer',
        pgStatus: 'Current User',
        profileCompleted: true,
        detailsFilled: true,"""

user_new = r"""      // Save to users collection as Upcoming User (requires approval & onboarding)
      await setDoc(doc(db, 'users', newUser.uid), {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        role: 'customer',
        pgStatus: 'Upcoming User',
        profileCompleted: false,
        detailsFilled: false,"""

content = content.replace(user_old, user_new)

# Change subscribedPG status to 'Pending' (or 'Upcoming User')
spg_old = r"""          meterReadingAtJoin: Number(formData.meterReading) || 0,
          dateOfJoining: joinIso,
          kycStatus: 'approved',
          status: 'Approved'
        }
      });"""

spg_new = r"""          meterReadingAtJoin: Number(formData.meterReading) || 0,
          dateOfJoining: joinIso,
          kycStatus: 'pending',
          status: 'Pending'
        }
      });"""

content = content.replace(spg_old, spg_new)

# Change tenants collection status to 'Pending'
t_old = r"""        registeredVia: 'already_residence',
        isAlreadyResident: true,
        status: 'Approved'
      }, { merge: true });"""

t_new = r"""        registeredVia: 'already_residence',
        isAlreadyResident: true,
        status: 'Pending'
      }, { merge: true });"""

content = content.replace(t_old, t_new)

with open('Febebo-admin/src/pages/AlreadyResidence.jsx', 'w') as f:
    f.write(content)

