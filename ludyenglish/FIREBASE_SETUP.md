# Configuration de l'authentification Google avec Firebase

## Étape 1 : Créer un projet Firebase

1. Allez sur [Firebase Console](https://console.firebase.google.com/)
2. Cliquez sur "Ajouter un projet"
3. Donnez un nom à votre projet (ex: "LudyEnglish")
4. Suivez les étapes de création

## Étape 2 : Activer l'authentification Google

1. Dans votre projet Firebase, allez dans **Authentication** (menu de gauche)
2. Cliquez sur **Get started** si c'est la première fois
3. Allez dans l'onglet **Sign-in method**
4. Cliquez sur **Google** dans la liste des fournisseurs
5. Activez le bouton **Enable**
6. Sélectionnez un email de support pour le projet
7. Cliquez sur **Save**

## Étape 3 : Activer Firestore Database

1. Dans votre projet Firebase, allez dans **Firestore Database** (menu de gauche)
2. Cliquez sur **Create database**
3. Choisissez **Start in test mode** (pour le développement)
4. Sélectionnez une région proche de vous
5. Cliquez sur **Enable**

⚠️ **Important pour la production** : Modifiez les règles de sécurité Firestore :

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Étape 4 : Obtenir les clés de configuration

1. Dans votre projet Firebase, cliquez sur l'icône **⚙️ Settings** (roue dentée) en haut à gauche
2. Allez dans **Project settings**
3. Faites défiler jusqu'à **Your apps**
4. Cliquez sur l'icône **</>** (Web)
5. Donnez un nom à votre app (ex: "LudyEnglish Web")
6. Cliquez sur **Register app**
7. Copiez les valeurs de configuration Firebase

## Étape 5 : Configurer les variables d'environnement

1. Créez un fichier `.env` à la racine du projet `ludyenglish/`
2. Copiez le contenu de `.env.example` dans `.env`
3. Remplacez les valeurs par celles obtenues à l'étape 4 :

```env
VITE_FIREBASE_API_KEY=votre_api_key
VITE_FIREBASE_AUTH_DOMAIN=votre_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=votre_project_id
VITE_FIREBASE_STORAGE_BUCKET=votre_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=votre_messaging_sender_id
VITE_FIREBASE_APP_ID=votre_app_id
```

## Étape 6 : Ajouter .env au .gitignore

Assurez-vous que `.env` est dans votre `.gitignore` pour ne pas exposer vos clés :

```
.env
```

## Étape 7 : Tester l'authentification

1. Lancez le serveur de développement : `npm run dev`
2. Ouvrez l'application dans votre navigateur
3. Cliquez sur le bouton **"Se connecter avec Google"** dans la carte "Compte utilisateur"
4. Sélectionnez votre compte Google
5. Vous devriez voir votre nom et photo de profil s'afficher

## Fonctionnalités

Une fois connecté :
- ✅ Votre **meilleure série** est automatiquement sauvegardée dans le cloud
- ✅ Vos données sont synchronisées entre différents appareils
- ✅ Vous pouvez vous déconnecter et vous reconnecter sans perdre vos progrès

## Dépannage

### Erreur : "Firebase: Error (auth/unauthorized-domain)"
- Allez dans Firebase Console > Authentication > Settings > Authorized domains
- Ajoutez `localhost` et votre domaine de production

### Erreur : "Missing or insufficient permissions"
- Vérifiez que les règles Firestore sont correctement configurées (voir Étape 3)

### Les données ne se sauvegardent pas
- Vérifiez que vous êtes bien connecté (votre photo doit apparaître)
- Ouvrez la console du navigateur (F12) pour voir les erreurs éventuelles
- Vérifiez que Firestore Database est bien activé dans Firebase Console

## Support

Pour toute question, consultez la [documentation Firebase](https://firebase.google.com/docs).
