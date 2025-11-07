# 💾 Sauvegarde des données - LudyEnglish

## 🎯 Données sauvegardées

Votre application sauvegarde maintenant automatiquement toutes vos données importantes !

### 📊 Données synchronisées avec Firebase

Quand vous êtes **connecté avec Google**, ces données sont sauvegardées dans le cloud :

| Donnée | Description | Quand elle est sauvegardée |
|--------|-------------|----------------------------|
| **Meilleure série** | Votre record de bonnes réponses consécutives | À chaque nouvelle meilleure série |
| **Score total** | Nombre de bonnes réponses / total | Après chaque réponse |
| **Série actuelle** | Votre série en cours | En temps réel |
| **Nombre d'erreurs** | Mots à réviser | Après chaque erreur |
| **Dernière mise à jour** | Timestamp de la dernière sauvegarde | À chaque modification |

### 💻 Données locales (localStorage)

Ces données sont sauvegardées localement sur votre appareil (même sans connexion) :

- Mode d'apprentissage (flashcards, QCM, écriture)
- Direction (FR→EN ou EN→FR)
- Mélange activé/désactivé
- Thème (clair/sombre)
- Meilleure série (backup local)

---

## 🔄 Comment ça fonctionne ?

### 1. **Première connexion**

Quand vous vous connectez pour la première fois :
```
1. Création d'un profil Firebase
2. Initialisation des données à 0
3. Début de la synchronisation automatique
```

### 2. **Pendant l'utilisation**

Chaque action déclenche une sauvegarde :
```
✅ Bonne réponse → Score mis à jour → Sauvegarde Firebase
✅ Nouvelle série → Série actuelle mise à jour → Sauvegarde Firebase
✅ Nouveau record → Meilleure série mise à jour → Sauvegarde Firebase
❌ Erreur → Compteur d'erreurs incrémenté → Sauvegarde Firebase
```

### 3. **Reconnexion**

Quand vous vous reconnectez :
```
1. Chargement des données depuis Firebase
2. Restauration de votre score
3. Restauration de votre série actuelle
4. Restauration de vos erreurs
5. Reprise là où vous vous étiez arrêté !
```

---

## 🎮 Utilisation

### Scénario 1 : Utilisation sans connexion

```
📱 Appareil 1 (non connecté)
├─ Score : 10/15
├─ Série : 3
└─ Meilleure série : 5

❌ Données perdues au rechargement
```

### Scénario 2 : Utilisation avec connexion

```
📱 Appareil 1 (connecté)
├─ Score : 10/15
├─ Série : 3
└─ Meilleure série : 5
    ↓
☁️ Sauvegarde Firebase
    ↓
💻 Appareil 2 (connecté avec le même compte)
├─ Score : 10/15 ✅
├─ Série : 3 ✅
└─ Meilleure série : 5 ✅
```

---

## 🔍 Vérifier vos données

### Dans Firebase Console

1. Allez sur : https://console.firebase.google.com/project/ludyenglish-dbcb6
2. Cliquez sur **Firestore Database**
3. Naviguez vers **users** → **[votre-user-id]**
4. Vous verrez toutes vos données :

```json
{
  "bestStreak": 5,
  "totalScore": {
    "good": 10,
    "total": 15
  },
  "currentStreak": 3,
  "wrongWordsCount": 5,
  "lastUpdated": 1699315200000
}
```

### Dans la console du navigateur

Ouvrez la console (F12) et tapez :

```javascript
// Voir les données Firebase
console.log('User data:', userData);

// Voir les données locales
console.log('Local bestStreak:', localStorage.getItem('ludy:bestStreak'));
console.log('Local mode:', localStorage.getItem('ludy:mode'));
```

---

## 🐛 Dépannage

### Les données ne se sauvegardent pas

**Vérifiez que vous êtes connecté** :
- Votre photo de profil doit apparaître dans la carte "Compte utilisateur"
- Si vous voyez "Se connecter avec Google", vous n'êtes pas connecté

**Vérifiez Firestore** :
1. Firebase Console → Firestore Database
2. Vérifiez que la base de données est créée
3. Vérifiez les règles de sécurité

**Vérifiez la console** :
- Ouvrez la console du navigateur (F12)
- Cherchez des erreurs rouges
- Les erreurs Firebase apparaissent en rouge

### Les données ne se chargent pas au reload

**Attendez quelques secondes** :
- Le chargement depuis Firebase peut prendre 1-2 secondes
- Vous verrez un loader pendant le chargement

**Vérifiez votre connexion internet** :
- Firebase nécessite une connexion internet
- Sans connexion, seules les données locales sont disponibles

**Videz le cache** :
- Ctrl + Shift + Delete
- Cochez "Cookies et données de site"
- Reconnectez-vous

### Les données sont différentes sur différents appareils

**Synchronisation en cours** :
- Attendez quelques secondes
- Rafraîchissez la page (F5)
- Les données devraient se synchroniser

**Comptes différents** :
- Vérifiez que vous êtes connecté avec le même compte Google
- Chaque compte a ses propres données

---

## 🔒 Sécurité

### Règles Firestore

Vos données sont protégées par ces règles :

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      // Seul le propriétaire peut lire/écrire ses données
      allow read, write: if request.auth != null 
                         && request.auth.uid == userId;
    }
  }
}
```

**Cela signifie** :
- ✅ Vous seul pouvez voir vos données
- ✅ Vous seul pouvez modifier vos données
- ❌ Les autres utilisateurs ne peuvent pas accéder à vos données
- ❌ Les utilisateurs non connectés ne peuvent rien voir

---

## 📈 Améliorations futures possibles

- [ ] Historique complet des sessions
- [ ] Graphiques de progression
- [ ] Export des données en CSV
- [ ] Backup automatique hebdomadaire
- [ ] Statistiques par mot
- [ ] Temps d'étude total
- [ ] Badges et achievements

---

## 💡 Conseils

1. **Connectez-vous toujours** pour ne pas perdre vos données
2. **Utilisez le même compte Google** sur tous vos appareils
3. **Vérifiez régulièrement** votre progression dans Firebase Console
4. **Ne vous déconnectez pas** pendant une session d'apprentissage

---

**Vos données sont maintenant sauvegardées automatiquement ! 🎉**
