# 📝 Instructions pour créer le fichier .env

## Option 1 : Créer manuellement (Recommandé)

1. **Créez un nouveau fichier** nommé `.env` dans le dossier `ludyenglish/`
2. **Copiez-collez** le contenu suivant dans ce fichier :

```env
VITE_FIREBASE_API_KEY=AIzaSyC3mLr83HtUKM58zdPDAEPEkcf0an8dgEE
VITE_FIREBASE_AUTH_DOMAIN=ludyenglish-dbcb6.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=ludyenglish-dbcb6
VITE_FIREBASE_STORAGE_BUCKET=ludyenglish-dbcb6.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=404122287419
VITE_FIREBASE_APP_ID=1:404122287419:web:7543ce21b463a3270ccb1e
```

3. **Sauvegardez** le fichier

## Option 2 : Via la ligne de commande

Ouvrez un terminal dans le dossier `ludyenglish/` et exécutez :

### Windows (PowerShell)
```powershell
@"
VITE_FIREBASE_API_KEY=AIzaSyC3mLr83HtUKM58zdPDAEPEkcf0an8dgEE
VITE_FIREBASE_AUTH_DOMAIN=ludyenglish-dbcb6.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=ludyenglish-dbcb6
VITE_FIREBASE_STORAGE_BUCKET=ludyenglish-dbcb6.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=404122287419
VITE_FIREBASE_APP_ID=1:404122287419:web:7543ce21b463a3270ccb1e
"@ | Out-File -FilePath .env -Encoding utf8
```

### Windows (CMD)
```cmd
(
echo VITE_FIREBASE_API_KEY=AIzaSyC3mLr83HtUKM58zdPDAEPEkcf0an8dgEE
echo VITE_FIREBASE_AUTH_DOMAIN=ludyenglish-dbcb6.firebaseapp.com
echo VITE_FIREBASE_PROJECT_ID=ludyenglish-dbcb6
echo VITE_FIREBASE_STORAGE_BUCKET=ludyenglish-dbcb6.firebasestorage.app
echo VITE_FIREBASE_MESSAGING_SENDER_ID=404122287419
echo VITE_FIREBASE_APP_ID=1:404122287419:web:7543ce21b463a3270ccb1e
) > .env
```

## ✅ Vérification

Après avoir créé le fichier `.env`, vérifiez qu'il existe :

```bash
# Windows PowerShell
Test-Path .env

# Windows CMD ou Git Bash
dir .env
```

## 🔄 Redémarrer l'application

Après avoir créé le fichier `.env`, **redémarrez le serveur de développement** :

```bash
npm run dev
```

## ⚠️ Important

- Le fichier `.env` est dans le `.gitignore` et ne sera **pas versionné** (c'est normal pour la sécurité)
- Ne partagez **jamais** vos clés Firebase publiquement
- Si vous clonez le projet ailleurs, vous devrez recréer ce fichier

## 📌 Note

Actuellement, vos clés sont déjà dans `src/lib/firebase.ts`, donc l'application fonctionne sans le fichier `.env`. 

Le fichier `.env` est optionnel mais recommandé pour :
- Séparer la configuration du code
- Faciliter le déploiement
- Améliorer la sécurité
