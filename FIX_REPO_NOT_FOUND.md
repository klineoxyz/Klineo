# Fix: "Git: remote: Repository not found"

## Why this happens
GitHub often shows **"Repository not found"** when **authentication fails** (e.g. wrong or missing credentials), especially over HTTPS. They don’t say “login failed” for security reasons.

---

## Fix 1: Use a Personal Access Token (PAT) — recommended

GitHub no longer accepts your account password for `git push` over HTTPS. You must use a **Personal Access Token**.

### Step 1: Create a token
1. Open **https://github.com/settings/tokens**
2. **Tokens (classic)** → **Generate new token** → **Generate new token (classic)**
3. Name it (e.g. `KLINEO push`)
4. Set expiry (e.g. 90 days or No expiration)
5. Enable scope: **`repo`** (full control of private repositories)
6. Click **Generate token**
7. **Copy the token** (you won’t see it again)

### Step 2: Push using the token
In PowerShell or Command Prompt:

```powershell
cd c:\Users\Muaz\Desktop\KLINEO
git push -u origin main
```

When prompted:
- **Username:** `klineoxyz` (your GitHub username)
- **Password:** paste your **token** (not your GitHub password)

Git will remember the credentials. After this, `git push` should work without asking again.

### Optional: Store token in URL (so you’re not prompted)
```powershell
git remote set-url origin https://klineoxyz:YOUR_TOKEN_HERE@github.com/klineoxyz/Klineo.git
git push -u origin main
```
Replace `YOUR_TOKEN_HERE` with your token. **Never commit this URL or share it.**

---

## Fix 2: Use SSH instead of HTTPS

If you use SSH keys with GitHub:

### Step 1: Switch remote to SSH
```powershell
cd c:\Users\Muaz\Desktop\KLINEO
git remote set-url origin git@github.com:klineoxyz/Klineo.git
git push -u origin main
```

### Step 2: If you don’t have SSH keys set up
1. **https://github.com/settings/keys**
2. **New SSH key** → add your public key
3. Then run the commands above.

---

## Fix 3: Confirm the repo exists and you have access

1. Open **https://github.com/klineoxyz/Klineo** in your browser.
2. If you get **404**: repo name or org/user might be wrong (e.g. `Klineo` vs `klineo`, or different org).
3. If it’s **private**: make sure you’re logged in and have access.

---

## Verify your remote
```powershell
git remote -v
```
You should see:
```
origin  https://github.com/klineoxyz/Klineo.git (fetch)
origin  https://github.com/klineoxyz/Klineo.git (push)
```

If the URL is wrong, fix it:
```powershell
git remote set-url origin https://github.com/klineoxyz/CORRECT_REPO_NAME.git
```

---

## Quick checklist
- [ ] Repo **https://github.com/klineoxyz/Klineo** loads when you’re logged in
- [ ] You created a **PAT** with `repo` scope
- [ ] You use the **token** as the password when `git push` asks (or use the token-in-URL method)
- [ ] Or you use **SSH** and have added your key to GitHub

After that, `git push -u origin main` should succeed.
