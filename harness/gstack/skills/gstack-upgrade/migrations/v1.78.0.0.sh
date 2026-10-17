#!/usr/bin/env bash
# Migration: v1.78.0.0 — carry feature-discovery acknowledgements to GSTACK_HOME
# (#2728 absorption follow-through).
#
# Why a migration: pre-v1.78, `gstack-skill-start` gated the one-time feature
# prompts (.feature-prompted-continuous-checkpoint, .feature-prompted-model-
# overlay) on marker files BESIDE THE INSTALL — which, for project-local
# symlink installs, resolved into the project repo and left machine-state
# droppings in checkouts (#2728). v1.78 reads them from GSTACK_HOME. Without
# this copy, every existing install that already answered those prompts gets
# re-prompted once per feature.
#
# Idempotent: existing destination markers are left untouched. Non-fatal
# throughout — a failed copy just means one benign re-prompt.
set -u

INSTALL_DIR="${GSTACK_INSTALL_DIR:-$HOME/.claude/skills/gstack}"
_gstack_migration_dir="${BASH_SOURCE[0]//\\//}"; _gstack_migration_dir="${_gstack_migration_dir%/*}"
. "${_gstack_migration_dir}/../../bin/gstack-state-root.sh" 2>/dev/null || { echo "$0: cannot resolve the gstack state root: ${_gstack_migration_dir}/../../bin/gstack-state-root.sh is missing. fix: reinstall with ./setup or /gstack-upgrade (docs/state-root.md)" >&2; exit 1; }
gstack_state_root_select; GH="$_gstack_sr_root"

mkdir -p "$GH" 2>/dev/null || exit 0

for m in .feature-prompted-continuous-checkpoint .feature-prompted-model-overlay; do
  if [ -f "$INSTALL_DIR/$m" ] && [ ! -f "$GH/$m" ]; then
    touch "$GH/$m" 2>/dev/null && echo "migrated: $m → $GH"
  fi
done

exit 0
