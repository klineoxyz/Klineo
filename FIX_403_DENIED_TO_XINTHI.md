# Fix: "Permission denied to xinthi" (403)

## What’s wrong
Git is using **xinthi**’s cached credentials to push to **klineoxyz/Klineo**.  
The repo belongs to **klineoxyz**, so GitHub returns **403** because **xinthi** doesn’t have access.

## Fix: Push as **klineoxyz**

### Step 1: Clear cached GitHub credentials

Git must stop using **xinthi**’s stored login. Do **one** of the following.

**Option A – Git credential reject (quick)**  
In PowerShell:

```powershell
echo "protocol=https`nhost=github.com" | git credential reject
```

**Option B – Windows Credential Manager**

1. Press **Win + R** → type **`control /name Microsoft.CredentialManager`** → Enter.  
   Or: **Control Panel** → **User Accounts** → **Credential Manager** → **Windows Credentials**.
2. Find entries for **Git** / **github.com** (e.g. `git:https://github.com` or `github.com`).
3. Click each → **Remove**.

### Step 2: Remote already uses klineoxyz

The remote is set to:

```
https://klineoxyz@github.com/klineoxyz/Klineo.git
```

So Git will use **klineoxyz** as the username. No change needed.

### Step 3: Push again

```powershell
cd c:\Users\Muaz\Desktop\KLINEO
git push -u origin main
```

When prompted for **password**, use **klineoxyz**’s **Personal Access Token** (PAT), **not** xinthi’s and **not** your GitHub password.

- Create a PAT: **https://github.com/settings/tokens** → **Generate new token (classic)** → scope **`repo`**.
- Use it only for the **klineoxyz** account.

### Step 4: If you use two accounts (xinthi + klineoxyz)

- Use **klineoxyz** + **klineoxyz**’s PAT for **this repo** (KLINEO).
- Keep **xinthi** for other repos; Credential Manager will store both per-URL.

---

## Checklist

- [ ] Cleared GitHub credentials (Option A or B).
- [ ] `git remote -v` shows `https://klineoxyz@github.com/klineoxyz/Klineo.git`.
- [ ] `git push -u origin main` run from KLINEO folder.
- [ ] Password = **klineoxyz**’s PAT when prompted.

After this, the 403 “denied to xinthi” error should be gone.
