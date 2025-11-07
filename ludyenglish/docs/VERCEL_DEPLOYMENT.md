# 🚀 Déploiement sur Vercel - Guide de résolution

## 🔴 Problèmes identifiés

Vous rencontrez deux erreurs principales :

1. **`auth/unauthorized-domain`** : Le domaine Vercel n'est pas autorisé dans Firebase
2. **`manifest.json 401`** : Problème d'accès au manifest (probablement lié à la config Vercel)

---

## ✅ Solution 1 : Autoriser le domaine Vercel dans Firebase

### Étape 1 : Accéder à Firebase Console

1. Allez sur : https://console.firebase.google.com/project/ludyenglish-dbcb6
2. Cliquez sur **Authentication** dans le menu de gauche
3. Cliquez sur l'onglet **Settings** (en haut)
4. Descendez jusqu'à la section **Authorized domains**

### Étape 2 : Ajouter les domaines Vercel

Cliquez sur **Add domain** et ajoutez les domaines suivants :

#### Domaines à ajouter :

1. **Domaine de preview actuel** :
   ```
   anglais-k5vzt96j2-bibuptmcs-projects.vercel.app
   ```

2. **Domaine de production Vercel** (si différent) :
   ```
   votre-domaine-production.vercel.app
   ```

3. **Domaine personnalisé** (si vous en avez un) :
   ```
   votre-domaine.com
   ```

### Étape 3 : Sauvegarder

- Cliquez sur **Add** pour chaque domaine
- Les domaines autorisés par défaut sont :
  - ✅ `localhost` (déjà autorisé)
  - ✅ `ludyenglish-dbcb6.firebaseapp.com` (déjà autorisé)

---

## ✅ Solution 2 : Configurer les variables d'environnement sur Vercel

### Étape 1 : Accéder aux paramètres Vercel

1. Allez sur : https://vercel.com/bibuptmcs-projects/anglais
2. Cliquez sur **Settings**
3. Allez dans **Environment Variables**

### Étape 2 : Ajouter les variables Firebase

Ajoutez les variables suivantes **une par une** :

| Variable | Valeur |
|----------|--------|
| `VITE_FIREBASE_API_KEY` | `AIzaSyC3mLr83HtUKM58zdPDAEPEkcf0an8dgEE` |
| `VITE_FIREBASE_AUTH_DOMAIN` | `ludyenglish-dbcb6.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | `ludyenglish-dbcb6` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `ludyenglish-dbcb6.firebasestorage.app` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `404122287419` |
| `VITE_FIREBASE_APP_ID` | `1:404122287419:web:7543ce21b463a3270ccb1e` |

### Étape 3 : Sélectionner les environnements

Pour chaque variable, cochez :
- ✅ **Production**
- ✅ **Preview**
- ✅ **Development**

### Étape 4 : Sauvegarder et redéployer

1. Cliquez sur **Save** pour chaque variable
2. Allez dans l'onglet **Deployments**
3. Cliquez sur les **3 points** du dernier déploiement
4. Cliquez sur **Redeploy**

---

## ✅ Solution 3 : Vérifier la configuration Vercel

### Créer/Vérifier le fichier `vercel.json`

Créez un fichier `vercel.json` à la racine du projet avec :

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/manifest.json",
      "headers": [
        {
          "key": "Content-Type",
          "value": "application/manifest+json"
        },
        {
          "key": "Cache-Control",
          "value": "public, max-age=0, must-revalidate"
        }
      ]
    },
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ]
}
```

---

## 🔄 Ordre des opérations recommandé

1. ✅ **Autoriser les domaines dans Firebase** (Solution 1)
2. ✅ **Ajouter les variables d'environnement sur Vercel** (Solution 2)
3. ✅ **Créer le fichier vercel.json** (Solution 3)
4. ✅ **Commit et push les changements**
5. ✅ **Redéployer sur Vercel**
6. ✅ **Tester l'authentification**

---

## 🧪 Test après déploiement

1. Ouvrez votre application sur Vercel
2. Ouvrez la console du navigateur (F12)
3. Cliquez sur "Se connecter avec Google"
4. Vérifiez qu'il n'y a plus d'erreur `auth/unauthorized-domain`

---

## 🐛 Dépannage supplémentaire

### Si l'erreur persiste après avoir ajouté le domaine :

1. **Attendez 5-10 minutes** : Les changements Firebase peuvent prendre du temps
2. **Videz le cache du navigateur** : Ctrl + Shift + Delete
3. **Vérifiez que le domaine est bien dans la liste** : Firebase Console > Authentication > Settings > Authorized domains
4. **Vérifiez l'orthographe du domaine** : Il doit être exactement comme dans l'URL

### Si manifest.json retourne toujours 401 :

1. Vérifiez que le fichier existe dans `public/manifest.json`
2. Vérifiez que Vercel build correctement : Deployments > Build Logs
3. Essayez d'accéder directement à : `https://votre-domaine.vercel.app/manifest.json`

### Vérifier les variables d'environnement :

Dans la console du navigateur, tapez :
```javascript
console.log(import.meta.env.VITE_FIREBASE_API_KEY)
```

Si c'est `undefined`, les variables d'environnement ne sont pas chargées.

---

## 📝 Notes importantes

- ⚠️ **Chaque preview Vercel a un domaine différent** : Vous devrez peut-être ajouter plusieurs domaines
- ⚠️ **Les variables d'environnement sont obligatoires** : Sans elles, Firebase ne fonctionnera pas
- ⚠️ **Ne commitez JAMAIS le fichier .env** : Il est dans .gitignore pour une bonne raison

---

## 🎯 Résultat attendu

Après avoir suivi ces étapes :
- ✅ Pas d'erreur `auth/unauthorized-domain`
- ✅ Le bouton "Se connecter avec Google" fonctionne
- ✅ Le manifest.json se charge correctement
- ✅ L'application est entièrement fonctionnelle sur Vercel

---

## 📚 Ressources

- [Firebase Authorized Domains](https://firebase.google.com/docs/auth/web/redirect-best-practices#customize-domains)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
