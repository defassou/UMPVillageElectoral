# UMP 2026 — Dashboard Électoral KoBoToolbox

Application web autonome de suivi électoral en temps réel, connectée à KoBoToolbox.

## 📁 Structure du projet

```
ump-dashboard/
├── index.html     ← Page principale (ouvrir dans le navigateur)
├── style.css      ← Thème sombre institutionnel
├── app.js         ← Logique complète de l'application
└── README.md      ← Ce fichier
```

## 🚀 Utilisation

1. **Double-cliquez sur `index.html`** pour ouvrir dans votre navigateur
2. Allez dans l'onglet **Connexion API** (menu gauche)
3. Entrez votre **Token API** et votre **Asset UID** KoBoToolbox
4. Cliquez sur **Connecter et importer**

> ⚡ Pas de serveur nécessaire — tout fonctionne directement dans le navigateur.

## 🔑 Obtenir vos identifiants KoBoToolbox

| Élément | Où le trouver |
|---|---|
| **Token API** | kf.kobotoolbox.org → Compte → Sécurité → API Token |
| **Asset UID** | URL du formulaire : `/forms/[ASSET_UID]/summary` |

## 📊 Fonctionnalités

- **Vue d'ensemble** — 6 KPIs + 4 graphiques (section, région, ouverture BV, agents)
- **Carte interactive** — Markers géolocalisés par BV avec filtres
- **Résultats du scrutin** — Votes par parti (Section 3)
- **Grille des incidents** — Alertes classées par gravité
- **Agents observateurs** — Annuaire des agents déployés
- **Données brutes** — Tableau paginé, triable, filtrable, exportable CSV
- **Import local** — JSON ou CSV si pas de connexion internet
- **Données démo** — 85 enregistrements simulés pour tester

## 🌐 Compatibilité

Fonctionne sur Chrome, Firefox, Edge, Safari (version récente).
Optimisé mobile et desktop.

## ⚠️ Note CORS

KoBoToolbox autorise les requêtes depuis le navigateur avec le header `Authorization: Token`.
Si vous rencontrez une erreur CORS, essayez depuis Chrome avec l'extension **CORS Unblock**,
ou hébergez le fichier sur un serveur local :

```bash
python -m http.server 8080
# Puis ouvrez http://localhost:8080
```
