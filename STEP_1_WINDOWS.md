# Step 1: Generate Encryption Key (Windows)

Since you don't have OpenSSL installed, use Node.js instead (which you already have).

## Method 1: Using Node.js Script (EASIEST)

**Action 1:** In Cursor terminal, make sure you're in the project root:
```powershell
cd c:\Users\Muaz\Desktop\KLINEO
```

**Action 2:** Run the generator script:
```powershell
node generate-encryption-key.js
```

**Action 3:** You'll see output like:
```
🔑 Your ENCRYPTION_KEY:
a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456

Copy this entire key and add it to backend-skeleton/.env as:
ENCRYPTION_KEY=a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456
```

**Action 4:** Copy the key (the long string of letters and numbers)

---

## Method 2: Using Node.js One-Liner

**In terminal, type:**
```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Copy the output** - that's your encryption key!

---

## Method 3: Using PowerShell (Alternative)

**In terminal, type:**
```powershell
-join ((48..57) + (97..102) | Get-Random -Count 64 | ForEach-Object {[char]$_})
```

This generates a random hex string, but Method 1 is easier!

---

## After Getting the Key

1. Copy the entire key (64 characters)
2. Open `backend-skeleton/.env` file
3. Add at the bottom:
   ```
   ENCRYPTION_KEY=<paste-your-key-here>
   ```
4. Save the file

Then continue to Step 2 in the main guide!
