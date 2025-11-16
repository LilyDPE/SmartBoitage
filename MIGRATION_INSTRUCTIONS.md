# Instructions de Migration - Ajout Colonnes de Navigation

## Problème
Les colonnes `route_geom` et `route_instructions` sont manquantes dans la table `zones_boitage` en production, ce qui cause des erreurs lors du démarrage des tournées.

## Solution
Appliquer la migration 008 qui ajoute ces colonnes.

## Comment appliquer la migration

### Option 1 : Script automatique (recommandé)
```bash
# Définir la variable d'environnement DATABASE_URL
export DATABASE_URL="votre_connection_string_postgres"

# Exécuter le script
chmod +x scripts/apply-migration-008.sh
./scripts/apply-migration-008.sh
```

### Option 2 : Manuelle via psql
```bash
psql "votre_connection_string_postgres" -f migrations/008_add_route_columns_to_zones_boitage.sql
```

### Option 3 : Via l'interface PostgreSQL (pgAdmin, DBeaver, etc.)
Exécutez le contenu du fichier `migrations/008_add_route_columns_to_zones_boitage.sql` :

```sql
-- Add route_geom and route_instructions to zones_boitage table
ALTER TABLE zones_boitage
ADD COLUMN IF NOT EXISTS route_geom GEOMETRY(LineString, 4326),
ADD COLUMN IF NOT EXISTS route_instructions JSONB;

-- Add index on route_instructions for faster queries
CREATE INDEX IF NOT EXISTS idx_zones_boitage_route_instructions ON zones_boitage USING GIN (route_instructions);

-- Add comments
COMMENT ON COLUMN zones_boitage.route_geom IS 'Optimized route geometry (LineString) from route planning';
COMMENT ON COLUMN zones_boitage.route_instructions IS 'Turn-by-turn navigation instructions from OpenRouteService';
```

## Vérification
Après la migration, vérifiez que les colonnes ont été ajoutées :

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'zones_boitage'
AND column_name IN ('route_geom', 'route_instructions');
```

Vous devriez voir :
```
   column_name       | data_type
---------------------+-----------
 route_geom          | USER-DEFINED
 route_instructions  | jsonb
```

## Impact
- ✅ Les tournées pourront s'auto-optimiser automatiquement
- ✅ Les instructions de navigation turn-by-turn s'afficheront
- ✅ Le mode 2 personnes fonctionnera correctement
- ✅ La fonctionnalité Quick Tour fonctionnera sans erreur

## Problèmes résolus
1. **Erreur Quick Tour** : `column ses.statut does not exist` → Corrigée en utilisant `ses.ended_at IS NULL`
2. **Erreur Navigation** : `column "route_geom" does not exist` → Ajoutée via migration 008
