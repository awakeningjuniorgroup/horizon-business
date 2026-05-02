// EXEMPLE DE MISE À JOUR DU NAVBAR AVEC LES TRADUCTIONS

// Dans Navbar.jsx, remplacer:
// const { user, role, getCartCount, token, axios, backendUrl, products, currency } = useAppContext();

// Par:
// const { user, role, getCartCount, token, axios, backendUrl, products, currency, t } = useAppContext();

// Puis remplacer les textes en anglais par les traductions:

// 1. Placeholder de recherche:
// "Search products..." → {t.common.search}

// 2. Navigation links:
// "Home" → {t.nav.home}
// "Products" → {t.nav.products}
// "Cart" → {t.nav.cart}
// "About" → {t.nav.about}
// "Contact" → {t.nav.contact}
// "Dashboard" → {t.nav.dashboard}

// 3. Messages d'erreur:
// "Please login to continue" → {t.messages.pleaseLogin}
// "Session expired..." → {t.messages.networkError}

// 4. Boutons:
// "Sign In" → {t.auth.signIn}
// "Sign Out" → {t.auth.signOut}
// "Sign Up" → {t.auth.signup}

// EXEMPLE DE CODE COMPLÈTE:
/\*

const Navbar = () => {
const [open, setOpen] = useState(false);
const [scrolled, setScrolled] = useState(false);
const [showNotif, setShowNotif] = useState(false);
const [notifications, setNotifications] = useState([]);

const { user, role, getCartCount, token, axios, backendUrl, products, currency, t } = useAppContext();

// ... rest of component ...

return (
<nav className="navbar">
<div className="search-bar">
<input
placeholder={t.common.search}
// ...
/>
</div>

      <div className="nav-links">
        <Link to="/home">{t.nav.home}</Link>
        <Link to="/products">{t.nav.products}</Link>
        <Link to="/about">{t.nav.about}</Link>
        <Link to="/contact">{t.nav.contact}</Link>
      </div>

      {user ? (
        <button>{t.auth.signOut}</button>
      ) : (
        <>
          <button>{t.auth.signIn}</button>
          <button>{t.auth.signup}</button>
        </>
      )}
    </nav>

);
};

\*/
