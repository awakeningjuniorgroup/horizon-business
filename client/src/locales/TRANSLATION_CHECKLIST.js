// LISTE DES FICHIERS À METTRE À JOUR EN FRANÇAIS
// Fichiers prioritaires (interface principale):

// 1. client/src/components/Navbar.jsx
//    - Placeholder de recherche
//    - Liens de navigation (Home, Products, Cart, About, Contact)
//    - Boutons (Sign In, Sign Out, Sign Up, Dashboard)
//    - Textes d'erreur et messages

// 2. client/src/pages/Home.jsx
//    - Titre de bienvenue
//    - Descriptions de sections
//    - Boutons d'action
//    - Textes des bannières

// 3. client/src/components/Categories.jsx
//    - Titres des catégories
//    - Messages de chargement
//    - Textes des boutons

// 4. client/src/pages/Cart.jsx
//    - Titre du panier
//    - Labels (Quantité, Prix, Total)
//    - Boutons (Continuer, Passer commande)
//    - Messages (Panier vide)

// 5. client/src/pages/Collection.jsx
//    - Titre de la collection
//    - Filtres
//    - Tri
//    - Message d'erreur

// 6. client/src/pages/Product.jsx
//    - Titre du produit
//    - Descriptions
//    - Avis clients
//    - Bouton "Ajouter au panier"

// 7. client/src/pages/MyOrders.jsx
//    - Titre "Mes Commandes"
//    - Labels (Statut, Date, Total)
//    - Boutons (Suivre, Annuler)

// 8. client/src/pages/MyProfile.jsx
//    - Titre du profil
//    - Labels de formulaire
//    - Boutons (Modifier, Enregistrer)

// 9. client/src/pages/Contact.jsx
//    - Titre
//    - Labels de formulaire
//    - Bouton d'envoi
//    - Messages de confirmation

// 10. client/src/pages/About.jsx
//     - Titre
//     - Descriptions
//     - Sections d'information

// ÉTAPES DE MISE À JOUR:
// 1. Ajouter cette ligne dans chaque composant:
//    const { t } = useAppContext();
//
// 2. Remplacer les textes anglais par les clés de traduction:
//    "Home" → {t.nav.home}
//    "Products" → {t.nav.products}
//    etc...
//
// 3. Pour les textes qui ne sont pas dans les traductions,
//    les ajouter à src/locales/fr.js

export const TRANSLATION_CHECKLIST = {
  "Navbar.jsx": "❌ À faire",
  "Home.jsx": "❌ À faire",
  "Categories.jsx": "❌ À faire",
  "Cart.jsx": "❌ À faire",
  "Collection.jsx": "❌ À faire",
  "Product.jsx": "❌ À faire",
  "MyOrders.jsx": "❌ À faire",
  "MyProfile.jsx": "❌ À faire",
  "Contact.jsx": "❌ À faire",
  "About.jsx": "❌ À faire",
  "Login.jsx": "❌ À faire",
  "Footer.jsx": "❌ À faire",
};
