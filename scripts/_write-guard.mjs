/**
 * Garde-fous partagés par les scripts qui écrivent dans Supabase.
 *
 * La table `films` a des policies RLS qui n'autorisent l'update/delete qu'aux
 * admins (is_admin()). Avec la clé anon (VITE_SUPABASE_PUBLISHABLE_KEY), un
 * update/delete "réussit" (aucune erreur renvoyée par Supabase) mais modifie
 * 0 ligne, silencieusement. Ces helpers évitent ce faux-positif.
 */

export function requireServiceRoleKey(env = process.env) {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error(
      `\n❌ SUPABASE_SERVICE_ROLE_KEY manquante dans .env.\n` +
      `Ce script écrit dans la base. Avec la clé anon (VITE_SUPABASE_PUBLISHABLE_KEY),\n` +
      `les policies RLS ("Only admins can update/delete films") bloquent l'écriture\n` +
      `SANS renvoyer d'erreur : le script afficherait un succès alors que rien n'a\n` +
      `changé en base.\n` +
      `Ajoute SUPABASE_SERVICE_ROLE_KEY=... dans .env (Supabase Dashboard > Project\n` +
      `Settings > API > service_role) avant de relancer.\n`
    );
    process.exit(1);
  }
}

/** Update + vérifie qu'au moins une ligne a réellement été modifiée. */
export async function updateAndVerify(supabase, table, id, patch) {
  const { data, error } = await supabase
    .from(table)
    .update(patch)
    .eq('id', id)
    .select('id');

  if (error) return { error };
  if (!data || data.length === 0) {
    return { error: new Error(`0 ligne affectée pour id=${id} (RLS bloque l'update, ou ligne absente)`) };
  }
  return { error: null };
}

/** Delete + vérifie que toutes les lignes attendues ont bien été supprimées. */
export async function deleteAndVerify(supabase, table, ids) {
  const { data, error } = await supabase
    .from(table)
    .delete()
    .in('id', ids)
    .select('id');

  if (error) return { error, deletedIds: [] };
  const deletedIds = (data || []).map((r) => r.id);
  if (deletedIds.length !== ids.length) {
    const missing = ids.filter((id) => !deletedIds.includes(id));
    return {
      error: new Error(
        `${missing.length}/${ids.length} ligne(s) non supprimée(s) (RLS ? ids déjà absents ?) : ` +
        `${missing.slice(0, 5).join(', ')}${missing.length > 5 ? '…' : ''}`
      ),
      deletedIds,
    };
  }
  return { error: null, deletedIds };
}
