// Hook personnalisé pour les traductions
// Utilisez ce hook dans vos composants pour accéder simplement aux traductions

import { useAppContext } from './AppContext';

/**
 * Hook pour accéder aux traductions
 * Utilisation: const t = useTranslation();
 * Puis: t.nav.home, t.common.save, etc...
 */
export const useTranslation = () => {
  const { t } = useAppContext();
  return t;
};

/**
 * Hook pour obtenir un texte traduit avec un fallback en anglais
 * Utilisation: const text = useTranslationKey('nav.home');
 */
export const useTranslationKey = (key) => {
  const t = useTranslation();
  
  // Navigate through nested object using dot notation
  return key.split('.').reduce((obj, k) => obj?.[k] || key, t);
};

/**
 * Exemple d'utilisation dans un composant:
 * 
 * import { useTranslation } from '../utils/useTranslation';
 * 
 * const MyComponent = () => {
 *   const t = useTranslation();
 *   
 *   return (
 *     <div>
 *       <h1>{t.nav.home}</h1>
 *       <button>{t.common.save}</button>
 *     </div>
 *   );
 * };
 */
