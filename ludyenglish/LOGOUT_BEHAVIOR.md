# 👋 Comportement à la déconnexion

## 🎯 Problème résolu

**Avant** : Quand vous vous déconnectiez, les données restaient affichées dans le Scoreboard

**Maintenant** : À la déconnexion, toutes les données sont réinitialisées !

---

## ✅ Comportement actuel

### Quand vous vous déconnectez :

1. **Notification affichée** : "👋 Déconnecté - Données réinitialisées"
2. **Score réinitialisé** : 0/0
3. **Série actuelle** : 0
4. **Précision** : 0%
5. **Erreurs** : 0
6. **Meilleure série** : Conservée dans localStorage (pour référence locale)

---

## 🔄 Cycle complet

### 1. Connexion
```
Vous vous connectez avec Google
   ↓
Chargement des données depuis Firebase
   ↓
Scoreboard affiche vos données sauvegardées
   ↓
Vous pouvez continuer votre progression
```

### 2. Utilisation
```
Vous répondez à des questions
   ↓
Score se met à jour en temps réel
   ↓
Sauvegarde automatique dans Firebase
   ↓
Données synchronisées
```

### 3. Déconnexion
```
Vous cliquez sur "Se déconnecter"
   ↓
Notification : "👋 Déconnecté"
   ↓
Score → 0/0
Série → 0
Erreurs → 0
   ↓
Interface propre et prête pour un nouvel utilisateur
```

### 4. Reconnexion
```
Vous vous reconnectez
   ↓
Chargement depuis Firebase
   ↓
Toutes vos données sont restaurées ! ✅
```

---

## 📊 Données conservées vs réinitialisées

### À la déconnexion

| Donnée | Comportement | Raison |
|--------|-------------|--------|
| **Score (good/total)** | ❌ Réinitialisé à 0/0 | Données personnelles |
| **Série actuelle** | ❌ Réinitialisé à 0 | Données de session |
| **Erreurs** | ❌ Liste vidée | Données personnelles |
| **Meilleure série** | ✅ Conservée localement | Référence locale |
| **Mode** | ✅ Conservé | Préférence UI |
| **Direction** | ✅ Conservée | Préférence UI |
| **Thème** | ✅ Conservé | Préférence UI |

### À la reconnexion

| Donnée | Source | Comportement |
|--------|--------|-------------|
| **Score** | Firebase | ✅ Restauré depuis le cloud |
| **Série actuelle** | Firebase | ✅ Restauré depuis le cloud |
| **Meilleure série** | Firebase | ✅ Restauré depuis le cloud |
| **Erreurs** | Firebase | ✅ Restauré depuis le cloud |

---

## 🔧 Implémentation technique

### Code ajouté (lignes 216-223)

```typescript
// Reset when user logs out
if (!user && hasLoadedUserData) {
  // Réinitialiser toutes les données
  setScore({ good: 0, total: 0 });
  setCurrentStreak(0);
  setWrongRows([]);
  setHasLoadedUserData(false);
  showToast("👋 Déconnecté - Données réinitialisées", "info", setToasts, toastIdRef);
}
```

### Déclenchement

La réinitialisation se déclenche quand :
- `user` devient `null` (déconnexion)
- ET `hasLoadedUserData` est `true` (des données étaient chargées)

---

## 🧪 Test de validation

### Test 1 : Déconnexion simple

1. **Connectez-vous** avec Google
2. **Répondez à quelques questions** (ex: 5/10)
3. **Vérifiez le Scoreboard** :
   ```
   Score: 5/10
   Série: 2
   Précision: 50%
   Erreurs: 5
   ```
4. **Cliquez sur "Se déconnecter"**
5. **Vérifiez** :
   - ✅ Notification : "👋 Déconnecté - Données réinitialisées"
   - ✅ Score : 0/0
   - ✅ Série : 0
   - ✅ Précision : 0%
   - ✅ Erreurs : 0

### Test 2 : Reconnexion

1. **Après le test 1**, reconnectez-vous
2. **Attendez 2-3 secondes** (chargement)
3. **Vérifiez** :
   - ✅ Score : 5/10 (restauré)
   - ✅ Série : 2 (restauré)
   - ✅ Précision : 50% (restauré)
   - ✅ Erreurs : 5 (restauré)

### Test 3 : Multi-utilisateurs

1. **Utilisateur A** se connecte
2. **Score** : 10/15
3. **Déconnexion** → Score : 0/0 ✅
4. **Utilisateur B** se connecte
5. **Score** : 0/0 (nouveau compte) ✅
6. **Utilisateur B** répond → Score : 3/5
7. **Déconnexion** → Score : 0/0 ✅
8. **Utilisateur A** se reconnecte
9. **Score** : 10/15 (ses données) ✅

---

## 💡 Pourquoi cette approche ?

### Avantages

1. **Confidentialité** : Les données d'un utilisateur ne restent pas visibles
2. **Multi-utilisateurs** : Plusieurs personnes peuvent utiliser le même appareil
3. **Interface propre** : Pas de données résiduelles
4. **Feedback clair** : Notification de déconnexion

### Alternative non retenue

**Conserver les données affichées** :
- ❌ Problème de confidentialité
- ❌ Confusion entre utilisateurs
- ❌ Données d'un autre utilisateur visibles

---

## 🎯 Cas d'usage

### Cas 1 : Usage personnel

```
Vous utilisez l'app seul(e)
   ↓
Vous vous déconnectez rarement
   ↓
Vos données sont toujours disponibles
   ↓
Pas d'impact sur votre expérience
```

### Cas 2 : Usage partagé (famille, classe)

```
Plusieurs utilisateurs sur le même appareil
   ↓
Chacun se connecte avec son compte
   ↓
À la déconnexion, données effacées
   ↓
L'utilisateur suivant voit une interface propre
   ↓
Confidentialité préservée ✅
```

### Cas 3 : Appareil public

```
Ordinateur de bibliothèque/école
   ↓
Vous vous connectez
   ↓
Vous travaillez
   ↓
Vous vous déconnectez
   ↓
Vos données ne restent pas visibles
   ↓
Sécurité assurée ✅
```

---

## 🔒 Sécurité

### Données effacées de la mémoire

À la déconnexion, ces données sont supprimées de la RAM :
- ✅ Score
- ✅ Série actuelle
- ✅ Liste des erreurs
- ✅ Données utilisateur Firebase

### Données conservées localement

Ces préférences restent (pas de données personnelles) :
- ✅ Mode d'apprentissage
- ✅ Direction FR→EN ou EN→FR
- ✅ Thème clair/sombre
- ✅ Meilleure série (référence locale)

---

## 🐛 Dépannage

### Les données ne se réinitialisent pas

**Cause** : Le hook de déconnexion ne se déclenche pas

**Solution** :
1. Vérifiez que vous êtes bien connecté avant
2. Cliquez bien sur "Se déconnecter" dans la carte "Compte utilisateur"
3. Rafraîchissez la page si nécessaire

### La notification ne s'affiche pas

**Cause** : Le toast est peut-être masqué

**Solution** :
1. Regardez en haut à droite de l'écran
2. La notification apparaît pendant 3 secondes
3. Si vous ne la voyez pas, vérifiez la console (F12)

### Les données réapparaissent

**Cause** : Vous êtes toujours connecté

**Solution** :
1. Vérifiez la carte "Compte utilisateur"
2. Si vous voyez votre photo, vous êtes connecté
3. Cliquez sur "Se déconnecter"

---

## 📝 Résumé

| Action | Résultat |
|--------|----------|
| **Connexion** | Chargement des données depuis Firebase |
| **Utilisation** | Sauvegarde automatique en temps réel |
| **Déconnexion** | Réinitialisation complète des données |
| **Reconnexion** | Restauration des données sauvegardées |

---

**Votre vie privée est protégée ! 🔒**
