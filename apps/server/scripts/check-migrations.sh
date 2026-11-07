set -u
# stdin closed so a rename prompt fails instead of hanging CI.
# drizzle-kit exits 0 on an invalid migration folder, so only this line proves the schema matches.
output=$(drizzle-kit generate </dev/null 2>&1)
status=$?
printf '%s\n' "$output"
if [ "$status" -ne 0 ] || ! printf '%s\n' "$output" | grep -q 'No schema changes, nothing to migrate'; then
	echo "drizzle-kit did not confirm the migrations match the schema. Either the schema changed without a migration, and drizzle-kit wrote one under apps/server/drizzle/ to review and commit, or the migration folder is invalid, as the output above shows." >&2
	exit 1
fi
