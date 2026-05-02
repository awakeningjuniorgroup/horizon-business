// GUIDE D'UTILISATION DES TRADUCTIONS

// Dans n'importe quel composant, vous pouvez utiliser:
// const { t } = useAppContext();

// Ensuite accéder aux traductions comme suit:

// Exemple 1: Navigation
// t.nav.home // "Accueil"
// t.nav.products // "Produits"
// t.nav.cart // "Panier"

// Exemple 2: Messages communs
// t.common.save // "Enregistrer"
// t.common.cancel // "Annuler"
// t.messages.loginSuccess // "Connexion réussie"

// Exemple 3: Page d'accueil
// t.home.welcome // "Bienvenue sur Kuaku Market"
// t.home.shopNow // "Acheter maintenant"

// MISE À JOUR DES COMPOSANTS - EXEMPLE:
//
// import React from 'react';
// import { useAppContext } from '../context/AppContext';
//
// const MyComponent = () => {
// const { t } = useAppContext();
//  
// return (
// <div>
// <h1>{t.home.welcome}</h1>
// <button>{t.common.save}</button>
// <p>{t.messages.loginSuccess}</p>
// </div>
// );
// };
//
// export default MyComponent;

// Les traductions disponibles sont:
// - t.nav._ : Navigation items
// - t.common._ : Common UI elements
// - t.home._ : Home page strings
// - t.products._ : Product page strings
// - t.cart._ : Shopping cart strings
// - t.checkout._ : Checkout process strings
// - t.orders._ : Order management strings
// - t.account._ : User account strings
// - t.auth._ : Authentication strings
// - t.messages._ : Notification messages
// - t.dashboard._ : Dashboard strings
// - t.contact._ : Contact page strings
// - t.misc.\* : Miscellaneous strings
