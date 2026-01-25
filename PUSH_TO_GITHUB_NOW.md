# Push KLINEO to GitHub — Step-by-Step

Your repo and remote are set up. Push fails from **Cursor’s terminal** because of proxy/network. Use **Windows PowerShell** (outside Cursor) and a **GitHub Personal Access Token**.

---

## Step 1: Create a Personal Access Token (PAT)

1. Open **https://github.com/settings/tokens**
2. **Tokens (classic)** → **Generate new token (classic)**
3. **Note:** `KLINEO push`
4. **Expiration:** e.g. 90 days or No expiration
5. **Scopes:** check **`repo`**
6. **Generate token** → **copy the token** (you won’t see it again)

---

## Step 2: Open PowerShell Outside Cursor

- Press **Win + R** → type **`powershell`** → Enter  
- Or open **Windows PowerShell** from the Start menu  
- **Do not** use Cursor’s integrated terminal.

---

## Step 3: Push

Run:

```powershell
cd c:\Users\Muaz\Desktop\KLINEO
git push -u origin main
```

When prompted:

- **Username:** `klineoxyz`
- **Password:** paste your **PAT** (not your GitHub password)

---

## Step 4: If You Get “Failed to connect via 127.0.0.1”

Git is using a proxy. In the **same** PowerShell window, run:

```powershell
$env:HTTP_PROXY = ""
$env:HTTPS_PROXY = ""
cd c:\Users\Muaz\Desktop\KLINEO
git push -u origin main
```

Then enter username + token when asked.

---

## Optional: Use the Script

```powershell
cd c:\Users\Muaz\Desktop\KLINEO
.\push-to-github.ps1
```

If you get "running scripts is disabled", run:
```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned -Force
```
then run the script again.

If you see the proxy error, edit `push-to-github.ps1` and uncomment the two `$env:HTTP_PROXY` / `$env:HTTPS_PROXY` lines, then run it again.

---

## Checklist

- [ ] PAT created at https://github.com/settings/tokens (scope: `repo`)
- [ ] PowerShell opened **outside** Cursor
- [ ] `cd c:\Users\Muaz\Desktop\KLINEO`
- [ ] `git push -u origin main`
- [ ] Username: `klineoxyz`, Password: **your token**
- [ ] If “via 127.0.0.1”: clear `HTTP_PROXY` / `HTTPS_PROXY` first

---

## Verify

After a successful push, open **https://github.com/klineoxyz/Klineo** — your commits should be there.
