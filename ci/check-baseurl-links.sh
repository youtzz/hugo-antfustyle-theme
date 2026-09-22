#!/usr/bin/env bash
# Assert brand / homeGroups / content images are baseURL-aware after hugo build.
# Usage: ci/check-baseurl-links.sh [baseURL]
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BASEURL="${1:-https://youtzz.github.io/hugo-antfustyle-theme/}"
OUT="$(mktemp -d)"
trap 'rm -rf "$OUT"' EXIT

BASE_PATH="$(python3 - <<PY
from urllib.parse import urlparse
print(urlparse("$BASEURL").path.rstrip("/"))
PY
)"

mkdir -p "$ROOT/exampleSite/themes"
ln -sfn "$ROOT" "$ROOT/exampleSite/themes/hugo-antfustyle-theme"

hugo --source "$ROOT/exampleSite" --destination "$OUT" --baseURL "$BASEURL" --minify >/dev/null

fail=0
assert_re() {
  local desc="$1" file="$2" pattern="$3"
  if rg -q -- "$pattern" "$file"; then
    echo "OK  $desc"
  else
    echo "FAIL $desc (/$pattern/ in $file)"
    fail=1
  fi
}
assert_not_re() {
  local desc="$1" file="$2" pattern="$3"
  if rg -q -- "$pattern" "$file"; then
    echo "FAIL $desc (unexpected /$pattern/ in $file)"
    fail=1
  else
    echo "OK  $desc"
  fi
}

if [[ -n "$BASE_PATH" ]]; then
  assert_re "brand href has base path" "$OUT/index.html" "class=brand href=${BASE_PATH}/"
  assert_re "404 cd.. has base path" "$OUT/404.html" "href=${BASE_PATH}/ class=cd-back"
  assert_re "Tech tag under base" "$OUT/index.html" "href=${BASE_PATH}/tags/"
  assert_re "content image under base" "$OUT/posts/typography/index.html" "src=${BASE_PATH}/images/example.svg"
  assert_not_re "no bare brand href=/" "$OUT/index.html" 'class=brand href=/[>" ]'
  assert_not_re "no bare /images/example.svg" "$OUT/posts/typography/index.html" 'src=/images/example\.svg'
else
  assert_re "brand href is /" "$OUT/index.html" 'class=brand href=/'
  assert_re "404 cd.. is /" "$OUT/404.html" 'href=/ class=cd-back'
  assert_re "Tech tag site-root" "$OUT/index.html" 'href=/tags/'
  assert_re "content image site-root" "$OUT/posts/typography/index.html" 'src=/images/example.svg'
fi

exit "$fail"
