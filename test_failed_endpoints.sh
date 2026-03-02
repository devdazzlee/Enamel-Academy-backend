#!/usr/bin/env bash
set -euo pipefail

# Configurable defaults (override via env vars)
BASE=${BASE:-"https://cpd.enamelacademy.co.uk"}
PASS=${PASS:-"SecurePass123!"}
NEW_PASS=${NEW_PASS:-"SecurePass456!"}
COURSE_ID=${COURSE_ID:-""}
COURSE_SLUG=${COURSE_SLUG:-""}
EVIDENCE_FILE=${EVIDENCE_FILE:-""}  # optional; only used if file exists
RUN_AUDIT=${RUN_AUDIT:-"0"}         # set to 1 to attempt audit endpoints (known 500 on server)

command -v jq >/dev/null || { echo "jq is required" >&2; exit 1; }
command -v curl >/dev/null || { echo "curl is required" >&2; exit 1; }

ts=$(date +%s)
EMAIL=${EMAIL:-"dr.smith+${ts}@dentalclinic.com"}

hdr() { printf "\n=== %s ===\n" "$1"; }

json() {
  local method=$1 url=$2 data=${3:-""}
  shift 3 || true
  if [[ -n "$data" ]]; then
    curl -sS "$@" -H "Content-Type: application/json" -X "$method" "$url" -d "$data"
  else
    curl -sS "$@" -H "Content-Type: application/json" -X "$method" "$url"
  fi
}

echo "BASE=$BASE"
echo "EMAIL=$EMAIL"

# 1) Register
hdr "Register"
REG=$(json POST "$BASE/wp-json/reactapi/v1/register" "{\"first_name\":\"John\",\"last_name\":\"Smith\",\"email\":\"$EMAIL\",\"password\":\"$PASS\",\"role\":\"dentist\"}")
echo "$REG" | jq .

# 2) Login → token
hdr "Login"
TOK=$(json POST "$BASE/wp-json/reactapi/v1/login" "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}")
echo "$TOK" | jq .
TOKEN=$(echo "$TOK" | jq -r '.data.token // .token // empty')
[[ -n "$TOKEN" && "$TOKEN" != null ]] || { echo "No token; abort" >&2; exit 1; }
AUTH=("-H" "Authorization: Bearer $TOKEN")

# 3) Change Password
hdr "Change Password"
json POST "$BASE/wp-json/reactapi/v1/user/change-password" "{\"current_password\":\"$PASS\",\"new_password\":\"$NEW_PASS\"}" "${AUTH[@]}" | jq .

# 4) Pick a real course ID/slug if not provided
if [[ -z "$COURSE_ID" || -z "$COURSE_SLUG" ]]; then
  hdr "Fetch first course for IDs"
  LIB=$(curl -sS "${AUTH[@]}" "$BASE/wp-json/reactapi/v1/courses/library?per_page=1")
  COURSE_ID=$(echo "$LIB"   | jq -r '.data.courses[0].id')
  COURSE_SLUG=$(echo "$LIB" | jq -r '.data.courses[0].slug')
fi
echo "Using COURSE_ID=$COURSE_ID, COURSE_SLUG=$COURSE_SLUG"

# 5) Enroll in course
hdr "Enroll Course"
curl -sS "${AUTH[@]}" -X POST "$BASE/wp-json/reactapi/v1/courses/enroll/$COURSE_ID" | jq .

# 6) Course detail endpoints
hdr "Dashboard Course Details"
curl -sS "${AUTH[@]}" "$BASE/wp-json/reactapi/v1/dashboard/courses/$COURSE_ID" | jq .
hdr "Get Course by ID"
curl -sS "${AUTH[@]}" "$BASE/wp-json/reactapi/v1/courses?id=$COURSE_ID" | jq .
hdr "Get Course by Slug"
curl -sS "${AUTH[@]}" "$BASE/wp-json/reactapi/v1/courses?slug=$COURSE_SLUG" | jq .

# 7) PDP create + reuse ID for formerly failing 404s
hdr "Create PDP - Minimal"
PDP_CREATE=$(json POST "$BASE/wp-json/reactapi/v1/pdp" "{\"name\":\"Auto PDP $ts\",\"year\":\"2025\",\"status\":[\"active\"]}" "${AUTH[@]}")
echo "$PDP_CREATE" | jq .
PDP_ID=$(echo "$PDP_CREATE" | jq -r '.data.id // empty')
[[ -n "$PDP_ID" ]] || { echo "No PDP_ID returned; abort" >&2; exit 1; }
echo "Using PDP_ID=$PDP_ID"

json GET "$BASE/wp-json/reactapi/v1/pdp/$PDP_ID"               "" "${AUTH[@]}" | jq .
json PUT "$BASE/wp-json/reactapi/v1/pdp/$PDP_ID"               "{\"description\":\"updated\"}" "${AUTH[@]}" | jq .
json PUT "$BASE/wp-json/reactapi/v1/pdp/$PDP_ID/status"        "{\"status\":\"active\"}" "${AUTH[@]}" | jq .
json POST "$BASE/wp-json/reactapi/v1/pdp/$PDP_ID/objectives"   "{\"objective\":\"Improve composites\",\"specialty\":\"General\"}" "${AUTH[@]}" | jq .
json POST "$BASE/wp-json/reactapi/v1/pdp/$PDP_ID/skills"       "{\"skill_name\":\"General Dentistry\",\"type\":\"current\",\"current_proficiency\":\"Intermediate\"}" "${AUTH[@]}" | jq .
json POST "$BASE/wp-json/reactapi/v1/pdp/$PDP_ID/skills"       "{\"skill_name\":\"Endodontics\",\"type\":\"develop\",\"target_proficiency\":\"Advanced\"}" "${AUTH[@]}" | jq .

hdr "Add Learning Activity"
ACTIVITY_RESP=$(json POST "$BASE/wp-json/reactapi/v1/pdp/$PDP_ID/activities" "{\"title\":\"Watch Lesson 1\",\"type\":\"course\",\"hours\":1.5,\"course_id\":$COURSE_ID}" "${AUTH[@]}")
echo "$ACTIVITY_RESP" | jq .
ACTIVITY_ID=$(echo "$ACTIVITY_RESP" | jq -r '.data.id // empty')

json POST "$BASE/wp-json/reactapi/v1/pdp/$PDP_ID/milestones"   "{\"title\":\"Finish module 1\",\"due_date\":\"2025-03-01\"}" "${AUTH[@]}" | jq .
json POST "$BASE/wp-json/reactapi/v1/pdp/$PDP_ID/reflection"   "{\"text\":\"Completed first lesson\"}" "${AUTH[@]}" | jq .

if [[ -n "$ACTIVITY_ID" ]]; then
  json POST "$BASE/wp-json/reactapi/v1/pdp/$PDP_ID/link-course"  "{\"activity_id\":\"$ACTIVITY_ID\",\"course_id\":$COURSE_ID}" "${AUTH[@]}" | jq .
else
  echo "Skip Link Course: activity_id missing"
fi
curl -sS -X DELETE "${AUTH[@]}" "$BASE/wp-json/reactapi/v1/pdp/$PDP_ID" | jq .

# 8) Assignment details if available
ASSIGN_ID=$(curl -sS "${AUTH[@]}" "$BASE/wp-json/reactapi/v1/courses/$COURSE_ID/assignments" | jq -r '.data.assignments[0].id // empty')
if [[ -n "$ASSIGN_ID" ]]; then
  hdr "Get Assignment Details"
  curl -sS "${AUTH[@]}" "$BASE/wp-json/reactapi/v1/assignments/$ASSIGN_ID" | jq .
else
  echo "Skip Assignment Details: no assignments available for course $COURSE_ID"
fi

# 9) External CPD (optional) and Audit (known 500 unless backend fixed)
if [[ -n "$EVIDENCE_FILE" && -f "$EVIDENCE_FILE" ]]; then
  hdr "Log External CPD"
  curl -sS "${AUTH[@]}" -F "title=Test CPD" -F "hours=1" -F "evidence=@${EVIDENCE_FILE}" \
    "$BASE/wp-json/reactapi/v1/cpd/log-external" | jq .
else
  echo "Skip Log External CPD (set EVIDENCE_FILE to a real path to try)."
fi

if [[ "$RUN_AUDIT" == "1" ]]; then
  hdr "Generate Audit Report"
  curl -sS "${AUTH[@]}" -X POST "$BASE/wp-json/reactapi/v1/cpd/generate-audit-report" | jq .
else
  echo "Skip Audit Report calls (set RUN_AUDIT=1 to attempt; currently 500 on server)."
fi

echo "\nDone."
