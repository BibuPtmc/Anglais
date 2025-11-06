# 🔐 Authentification Google - LudyEnglish

## ✅ Fonctionnalités implémentées

Votre application LudyEnglish dispose maintenant d'un système complet d'authentification Google avec :

### 🎯 Authentification
- **Connexion avec Google** : Les utilisateurs peuvent se connecter avec leur compte Gmail
- **Déconnexion** : Possibilité de se déconnecter à tout moment
- **Interface utilisateur moderne** : Carte dédiée avec photo de profil et informations utilisateur

### 💾 Sauvegarde des données
- **Meilleure série** : Automatiquement sauvegardée dans le cloud Firebase
- **Synchronisation multi-appareils** : Vos données sont accessibles depuis n'importe quel appareil
- **Persistance locale** : Les données restent disponibles même sans connexion (localStorage)

### 🎨 Interface
- **Carte "Compte utilisateur"** : Affichée à côté du Scoreboard et du Pomodoro
- **Design cohérent** : Utilise le même style glassmorphism que le reste de l'app
- **Responsive** : S'adapte à tous les écrans (mobile, tablette, desktop)

## 📦 Fichiers créés

```
ludyenglish/
├── src/
│   ├── lib/
│   │   └── firebase.ts              # Configuration Firebase
│   ├── components/
│   │   └── Auth.tsx                 # Composant d'authentification
│   ├── hooks/
│   │   └── useUserData.ts           # Hook pour gérer les données utilisateur
│   └── App.tsx                      # Modifié pour intégrer l'auth
├── .env.example                     # Template des variables d'environnement
├── .gitignore                       # Mis à jour pour exclure .env
├── FIREBASE_SETUP.md                # Guide de configuration Firebase
└── AUTH_README.md                   # Ce fichier
```

## 🚀 Prochaines étapes

### 1. Configurer Firebase (OBLIGATOIRE)

Suivez le guide détaillé dans **`FIREBASE_SETUP.md`** pour :
1. Créer un projet Firebase
2. Activer l'authentification Google
3. Activer Firestore Database
4. Obtenir vos clés de configuration
5. Créer le fichier `.env` avec vos clés

### 2. Créer le fichier .env

Créez un fichier `.env` à la racine de `ludyenglish/` avec ce contenu :

```env
VITE_FIREBASE_API_KEY=votre_api_key
VITE_FIREBASE_AUTH_DOMAIN=votre_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=votre_project_id
VITE_FIREBASE_STORAGE_BUCKET=votre_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=votre_messaging_sender_id
VITE_FIREBASE_APP_ID=votre_app_id
```

### 3. Redémarrer le serveur

Après avoir créé le fichier `.env`, redémarrez le serveur de développement :

```bash
npm run dev
```

## 🎮 Utilisation

1. **Ouvrez l'application** dans votre navigateur
2. **Trouvez la carte "Compte utilisateur"** (à droite du Pomodoro)
3. **Cliquez sur "Se connecter avec Google"**
4. **Sélectionnez votre compte Google**
5. **Votre photo et nom apparaissent** → Vous êtes connecté !

## 🔒 Sécurité

- ✅ Les clés Firebase sont dans `.env` (non versionné)
- ✅ Les règles Firestore limitent l'accès aux données de chaque utilisateur
- ✅ L'authentification est gérée par Google (OAuth 2.0)

## 📊 Données sauvegardées

Actuellement, les données suivantes sont sauvegardées dans Firebase :

| Donnée | Description | Synchronisation |
|--------|-------------|-----------------|
| `bestStreak` | Meilleure série de bonnes réponses | Automatique |
| `totalScore` | Score total (préparé pour usage futur) | Automatique |
| `lastUpdated` | Date de dernière mise à jour | Automatique |

## 🔧 Personnalisation

### Ajouter plus de données à sauvegarder

Modifiez `src/hooks/useUserData.ts` pour ajouter d'autres champs :

```typescript
export interface UserData {
  bestStreak: number;
  totalScore: { good: number; total: number };
  lastUpdated: number;
  // Ajoutez vos champs ici
  favoriteWords?: string[];
  studyTime?: number;
}
```

### Modifier l'apparence du composant Auth

Éditez `src/components/Auth.tsx` pour personnaliser :
- Les couleurs
- Le texte
- Les animations
- La disposition

## 🐛 Dépannage

### L'application ne compile pas
- Vérifiez que Firebase est bien installé : `npm install firebase`
- Vérifiez que le fichier `.env` existe et contient toutes les clés

### Le bouton de connexion ne fait rien
- Ouvrez la console du navigateur (F12) pour voir les erreurs
- Vérifiez que l'authentification Google est activée dans Firebase Console
- Vérifiez que `localhost` est dans les domaines autorisés (Firebase Console > Authentication > Settings)

### Les données ne se sauvegardent pas
- Vérifiez que vous êtes bien connecté (votre photo doit apparaître)
- Vérifiez que Firestore Database est activé
- Vérifiez les règles de sécurité Firestore (voir FIREBASE_SETUP.md)

## 📚 Ressources

- [Documentation Firebase](https://firebase.google.com/docs)
- [Firebase Authentication](https://firebase.google.com/docs/auth)
- [Cloud Firestore](https://firebase.google.com/docs/firestore)
- [React Firebase Hooks](https://github.com/CSFrequency/react-firebase-hooks)

## 💡 Idées d'amélioration futures

- [ ] Sauvegarder l'historique complet des sessions
- [ ] Ajouter des statistiques détaillées par mot
- [ ] Implémenter un système de badges/achievements
- [ ] Ajouter un classement entre utilisateurs
- [ ] Permettre le partage de listes de vocabulaire
- [ ] Ajouter la synchronisation des listes CSV personnalisées

---

**Bon apprentissage avec LudyEnglish ! 🎓✨**
