# 🧪 Test de la précision - Guide de vérification

## ✅ Problème corrigé

**Avant** : La précision restait à 0% même après avoir répondu à des questions.

**Maintenant** : La précision se calcule et se sauvegarde correctement !

---

## 🔧 Corrections apportées

### 1. Suppression des conditions restrictives

**Avant** :
```typescript
if (userData.totalScore.total > 0) {
  setScore(userData.totalScore);  // ❌ Ne charge pas si total = 0
}
```

**Maintenant** :
```typescript
if (userData.totalScore) {
  setScore(userData.totalScore);  // ✅ Charge toujours
}
```

### 2. Sauvegarde sans condition

**Avant** :
```typescript
if (user && saveUserData && score.total > 0) {
  saveUserData({ totalScore: score });  // ❌ Ne sauvegarde pas si total = 0
}
```

**Maintenant** :
```typescript
if (user && saveUserData) {
  saveUserData({ totalScore: score });  // ✅ Sauvegarde toujours
}
```

---

## 🧪 Procédure de test

### Test 1 : Calcul de la précision

1. **Connectez-vous** avec Google
2. **Répondez à 5 questions** :
   - 3 bonnes réponses ✅
   - 2 mauvaises réponses ❌
3. **Vérifiez le Scoreboard** :
   ```
   Score: 3/5
   Précision: 60%  ← Doit s'afficher !
   ```

### Test 2 : Sauvegarde de la précision

1. **Après le test 1**, notez votre précision
2. **Rechargez la page** (F5)
3. **Attendez 2-3 secondes** (chargement Firebase)
4. **Vérifiez le Scoreboard** :
   ```
   Score: 3/5 ✅
   Précision: 60% ✅  ← Doit être restauré !
   ```

### Test 3 : Mise à jour en temps réel

1. **Continuez à répondre** à des questions
2. **Observez la précision** qui se met à jour en temps réel
3. **Exemple** :
   ```
   Après 3/5 (60%)
   + 1 bonne réponse → 4/6 (67%)
   + 1 mauvaise réponse → 4/7 (57%)
   ```

### Test 4 : Synchronisation multi-appareils

1. **Sur l'appareil 1** :
   - Répondez à 10 questions
   - Score : 7/10
   - Précision : 70%

2. **Sur l'appareil 2** (même compte Google) :
   - Ouvrez l'application
   - Attendez le chargement
   - Vérifiez : Score 7/10, Précision 70% ✅

---

## 📊 Formule de calcul

La précision est calculée ainsi :

```typescript
const accuracy = score.total 
  ? Math.round((score.good / Math.max(score.total, 1)) * 100) 
  : 0;
```

**Exemples** :
- 0/0 → 0%
- 5/10 → 50%
- 7/10 → 70%
- 10/10 → 100%

---

## 🔍 Vérification dans Firebase

### Console du navigateur

Ouvrez la console (F12) et tapez :

```javascript
// Voir le score actuel
console.log('Score:', score);
// Devrait afficher : { good: 7, total: 10 }

// Voir la précision calculée
console.log('Accuracy:', accuracy);
// Devrait afficher : 70
```

### Firebase Console

1. Allez sur : https://console.firebase.google.com/project/ludyenglish-dbcb6
2. **Firestore Database** → **users** → **[votre-user-id]**
3. Vérifiez le champ `totalScore` :

```json
{
  "totalScore": {
    "good": 7,
    "total": 10
  }
}
```

---

## 🎯 Résultats attendus

### Scoreboard complet

Après avoir répondu à 10 questions (7 bonnes, 3 mauvaises) :

```
┌─────────────────────────────────┐
│        Scoreboard               │
├─────────────────────────────────┤
│ Série: 2                        │
│ Meilleure série: 4              │
│ Précision: 70%    ← ✅          │
│ Erreurs: 3                      │
└─────────────────────────────────┘
```

### Après rechargement

```
┌─────────────────────────────────┐
│        Scoreboard               │
├─────────────────────────────────┤
│ Série: 2          ✅ (restauré) │
│ Meilleure série: 4 ✅ (restauré)│
│ Précision: 70%    ✅ (restauré) │
│ Erreurs: 3        ✅ (restauré) │
└─────────────────────────────────┘
```

---

## 🐛 Dépannage

### La précision reste à 0%

**Cause possible** : Le score n'est pas mis à jour

**Solution** :
1. Ouvrez la console (F12)
2. Tapez : `console.log(score)`
3. Vérifiez que `total` et `good` ne sont pas à 0
4. Si c'est le cas, répondez à quelques questions

### La précision ne se restaure pas

**Cause possible** : Les données ne sont pas sauvegardées dans Firebase

**Solution** :
1. Vérifiez que vous êtes connecté (photo de profil visible)
2. Ouvrez la console et cherchez des erreurs Firebase
3. Vérifiez dans Firebase Console que `totalScore` existe
4. Attendez 5-10 secondes après le chargement

### La précision est incorrecte

**Cause possible** : Calcul erroné ou données corrompues

**Solution** :
1. Réinitialisez votre session : cliquez sur "Session complète"
2. Répondez à quelques questions pour recalculer
3. Si le problème persiste, déconnectez-vous et reconnectez-vous

---

## 📝 Checklist de validation

Avant de considérer que tout fonctionne :

- [ ] La précision s'affiche correctement après avoir répondu
- [ ] La précision se met à jour en temps réel
- [ ] La précision est sauvegardée dans Firebase
- [ ] La précision est restaurée après rechargement
- [ ] La précision se synchronise entre appareils
- [ ] Le calcul est correct (good/total * 100)

---

## 🚀 Déploiement

Une fois les tests validés localement :

```bash
git add .
git commit -m "fix: correction calcul et sauvegarde de la précision"
git push origin main
```

Puis testez sur Vercel !

---

## 💡 Note importante

La précision est **calculée dynamiquement** à partir du score. Elle n'est pas stockée directement dans Firebase, mais recalculée à chaque fois à partir de `totalScore.good` et `totalScore.total`.

Cela garantit que la précision est toujours exacte et cohérente avec le score ! ✅
