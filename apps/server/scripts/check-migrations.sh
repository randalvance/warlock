set -eu
snapshot() { find drizzle -type f | sort | xargs cksum; }
before=$(snapshot)
# stdin closed so a rename prompt fails instead of hanging CI.
drizzle-kit generate </dev/null
if [ "$before" != "$(snapshot)" ]; then
	echo "The schema changed without a migration. drizzle-kit wrote one under apps/server/drizzle/. Review it and commit it." >&2
	exit 1
fi
