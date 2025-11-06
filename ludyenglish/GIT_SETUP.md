# 🔧 Configuration Git et Push vers Vercel

## 📋 Étapes pour pousser vos changements

### 1. Vérifier l'état Git

```bash
git status
```

### 2. Ajouter tous les fichiers modifiés

```bash
git add .
```

### 3. Créer un commit

```bash
git commit -m "feat: ajout authentification Google Firebase"
```

### 4. Configurer le remote (si pas déjà fait)

Si vous avez l'erreur "No configured push destination", vous devez configurer le remote :

#### Option A : Si vous avez déjà un repo GitHub

```bash
git remote add origin https://github.com/votre-username/votre-repo.git
```

#### Option B : Créer un nouveau repo GitHub

1. Allez sur https://github.com/new
2. Créez un nouveau repository (ex: "ludyenglish")
3. **Ne cochez pas** "Initialize with README"
4. Cliquez sur "Create repository"
5. Copiez l'URL du repo (ex: `https://github.com/username/ludyenglish.git`)
6. Exécutez :

```bash
git remote add origin https://github.com/username/ludyenglish.git
git branch -M main
git push -u origin main
```

#### Option C : Si vous utilisez Vercel Git

Vercel peut se connecter directement à votre repo. Vérifiez dans :
- Vercel Dashboard > Votre projet > Settings > Git

### 5. Pousser les changements

```bash
git push origin main
```

Ou si c'est la première fois :

```bash
git push -u origin main
```

---

## 🚀 Déploiement automatique sur Vercel

Une fois que vous avez configuré Git et poussé vers GitHub/GitLab/Bitbucket :

1. **Vercel détecte automatiquement les changements**
2. **Un nouveau déploiement démarre**
3. **Vous recevez une notification** quand c'est terminé

---

## 📝 Fichiers importants à commit

Assurez-vous que ces fichiers sont bien commités :

- ✅ `vercel.json` (nouveau)
- ✅ `src/lib/firebase.ts` (modifié)
- ✅ `src/components/Auth.tsx` (nouveau)
- ✅ `src/hooks/useUserData.ts` (nouveau)
- ✅ `.env.example` (nouveau)
- ✅ `.gitignore` (modifié)
- ✅ `package.json` (modifié - firebase ajouté)
- ✅ Documentation (FIREBASE_SETUP.md, AUTH_README.md, etc.)

---

## ⚠️ Fichiers à NE PAS commit

Ces fichiers sont dans `.gitignore` et ne doivent **JAMAIS** être commités :

- ❌ `.env` (contient vos clés secrètes)
- ❌ `node_modules/`
- ❌ `dist/`

---

## 🔍 Vérifier ce qui sera commité

Avant de commit, vérifiez :

```bash
git status
git diff
```

---

## 🎯 Commandes Git utiles

### Voir l'historique des commits
```bash
git log --oneline
```

### Annuler les modifications non commitées
```bash
git restore .
```

### Voir les remotes configurés
```bash
git remote -v
```

### Changer l'URL du remote
```bash
git remote set-url origin https://nouvelle-url.git
```

---

## 📦 Après le push

1. **Vérifiez sur GitHub/GitLab** que vos fichiers sont bien là
2. **Vérifiez sur Vercel** qu'un nouveau déploiement a démarré
3. **Attendez la fin du build** (1-2 minutes)
4. **Testez votre application** sur le nouveau déploiement

---

## 🐛 Problèmes courants

### "fatal: not a git repository"
```bash
git init
git add .
git commit -m "Initial commit"
```

### "Permission denied (publickey)"
Vous devez configurer vos clés SSH :
- https://docs.github.com/en/authentication/connecting-to-github-with-ssh

### "Updates were rejected"
```bash
git pull origin main --rebase
git push origin main
```

---

## 💡 Conseil

Pour éviter de commit accidentellement le fichier `.env`, vérifiez toujours avec :

```bash
git status
```

Avant chaque commit !
