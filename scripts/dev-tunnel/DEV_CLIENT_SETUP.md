# Dev Tunnel Client Setup

Connect to this Windows PC via VS Code Remote SSH using `dev.ffxivbe.org`.

---

## Prerequisites

### Install cloudflared on the client PC

**Mac:**

```bash
brew install cloudflared
```

**Ubuntu / Debian:**

```bash
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o /tmp/cf.deb
sudo dpkg -i /tmp/cf.deb
```

**Windows (PowerShell):**

```powershell
Invoke-WebRequest -Uri "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.msi" -OutFile "$env:TEMP\cf.msi"
Start-Process msiexec -ArgumentList "/i `"$env:TEMP\cf.msi`" /quiet" -Wait
```

---

## SSH Config

Add to your SSH config file:

**Mac / Linux:** `~/.ssh/config`  
**Windows:** `C:\Users\<YourUser>\.ssh\config`

```
Host dev-windows
    HostName dev.ffxivbe.org
    User Heiner
    ProxyCommand cloudflared access ssh --hostname %h
    StrictHostKeyChecking accept-new
```

### Quick setup — Mac / Linux (run each line separately)

```bash
echo "" >> ~/.ssh/config
echo "Host dev-windows" >> ~/.ssh/config
echo "    HostName dev.ffxivbe.org" >> ~/.ssh/config
echo "    User Heiner" >> ~/.ssh/config
echo "    ProxyCommand cloudflared access ssh --hostname %h" >> ~/.ssh/config
echo "    StrictHostKeyChecking accept-new" >> ~/.ssh/config
```

### Quick setup — Windows PowerShell

```powershell
$c = "$env:USERPROFILE\.ssh\config"
if (!(Test-Path (Split-Path $c))) { New-Item -ItemType Directory -Path (Split-Path $c) -Force }
Add-Content -Path $c -Value "`nHost dev-windows`n    HostName dev.ffxivbe.org`n    User Heiner`n    ProxyCommand cloudflared access ssh --hostname %h`n    StrictHostKeyChecking accept-new`n"
```

---

## SSH Key Authentication

Password-less login requires your public key to be registered on the Windows PC.

### 1. Generate a key (if you don't have one)

```bash
ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519
```

### 2. Get your public key

```bash
cat ~/.ssh/id_ed25519.pub
```

### 3. Send it to the Windows PC owner

They run `setup-authorized-keys.ps1` after adding your key to `.secrets` as:

```
DEV_SSH_PUBLIC_KEY_<YOURNAME>=ssh-ed25519 AAAA... you@host
```

---

## VS Code Remote SSH

1. Install the **Remote - SSH** extension in VS Code
2. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
3. Select **Remote-SSH: Connect to Host...**
4. Choose `dev-windows`
5. Open folder: `Z:\Github\candystore` (type the path when prompted)

---

## Test SSH Connection

```bash
ssh dev-windows
```

---

## Troubleshooting

### "Could not resolve hostname dev-windows"

SSH config is missing. Add the `Host dev-windows` block (see above).

### "cloudflared: command not found"

Install cloudflared (see Prerequisites above).

### Connection refused / timeout

Check that the `dev-tunnel` scheduled task is running on the Windows PC:

- Run `manage-dev-tunnel.ps1` on the Windows PC to check status
- Or double-click **"Toggle Dev Tunnel"** shortcut on the Windows desktop

### VS Code can't find the remote host

Make sure `cloudflared` is on the system PATH. On Windows, restart VS Code after installing cloudflared.

### Asked for a password

Your public key is not registered. Follow the SSH Key Authentication steps above.

---

## Summary

| What                      | Where                                              |
| ------------------------- | -------------------------------------------------- |
| Install cloudflared       | See Prerequisites                                  |
| SSH config                | `~/.ssh/config` or `%USERPROFILE%\.ssh\config`     |
| Connect SSH               | `ssh dev-windows`                                  |
| VS Code connect           | Remote-SSH → `dev-windows`                         |
| Toggle tunnel (on host)   | `toggle-dev-tunnel.bat` or `manage-dev-tunnel.ps1` |
| Check status (on host)    | `.\manage-dev-tunnel.ps1`                          |
| Add new SSH key (on host) | `.\setup-authorized-keys.ps1`                      |
