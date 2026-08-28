#!/usr/bin/env bash
set -euo pipefail

# Builds the current branch's Docker image and rolls it out to the
# `smartbear-mcp` Deployment in the `seals` namespace (swh-dev EKS cluster).
#
# Requires: docker (with the `desktop-linux` buildx builder), aws cli,
# kubectl, and the corp Zscaler root CA available in the macOS keychain
# (local `npm ci` inside the builder stage fails without it).
#
# Env overrides: AWS_PROFILE, AWS_REGION, KUBE_CONTEXT, NAMESPACE,
# DEPLOYMENT, CONTAINER, PLATFORM.

AWS_PROFILE="${AWS_PROFILE:-swhdev}"
AWS_REGION="${AWS_REGION:-us-east-1}"
ECR_REGISTRY="213382840589.dkr.ecr.${AWS_REGION}.amazonaws.com"
ECR_REPO="smartbear-mcp"
NAMESPACE="${NAMESPACE:-seals}"
DEPLOYMENT="${DEPLOYMENT:-smartbear-mcp}"
CONTAINER="${CONTAINER:-mcp}"
KUBE_CONTEXT="${KUBE_CONTEXT:-swh-dev}"
PLATFORM="${PLATFORM:-linux/amd64}"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Warning: working tree has uncommitted changes - they will be included in the build." >&2
fi

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
BRANCH_SLUG="$(echo "$BRANCH" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g; s/^-+|-+$//g')"
SHORT_SHA="$(git rev-parse --short=8 HEAD)"
TIMESTAMP="$(date -u +%Y%m%d%H%M%S)"
IMAGE_TAG="${BRANCH_SLUG}-${SHORT_SHA}-${TIMESTAMP}"
FULL_IMAGE="${ECR_REGISTRY}/${ECR_REPO}:${IMAGE_TAG}"

echo "==> Building ${FULL_IMAGE} from branch ${BRANCH} (${SHORT_SHA})"

WORKDIR="$(mktemp -d)"
trap 'rm -rf "$WORKDIR"' EXIT

echo "==> Exporting corp Zscaler CA from keychain"
security find-certificate -a -c "Zscaler Root CA" -p /Library/Keychains/System.keychain > "$WORKDIR/corp-ca.pem"

cat > "$WORKDIR/Dockerfile.zscaler" <<'EOF'
ARG BUILDER_IMAGE_NAME=node:22-alpine
FROM ${BUILDER_IMAGE_NAME} AS builder

WORKDIR /app

COPY --from=corp-ca corp-ca.pem /usr/local/share/ca-certificates/corp-ca.crt
ENV NODE_EXTRA_CA_CERTS=/usr/local/share/ca-certificates/corp-ca.crt

COPY src/ ./src/
COPY package.json package-lock.json tsconfig.json vite.config.ts vitest.config.ts ./

RUN --mount=type=cache,target=/root/.npm npm ci

RUN npm run build

FROM node:22-alpine AS release

COPY --from=corp-ca corp-ca.pem /usr/local/share/ca-certificates/corp-ca.crt
ENV NODE_EXTRA_CA_CERTS=/usr/local/share/ca-certificates/corp-ca.crt
RUN cat /usr/local/share/ca-certificates/corp-ca.crt >> /etc/ssl/certs/ca-certificates.crt

RUN apk add --no-cache libcrypto3=3.5.7-r0 libssl3=3.5.7-r0

COPY --from=builder /app/dist /app/dist
COPY --from=builder /app/package.json /app/package.json
COPY --from=builder /app/package-lock.json /app/package-lock.json

ENV NODE_ENV=production

WORKDIR /app

RUN --mount=type=cache,target=/root/.npm-production npm ci --ignore-scripts --omit-dev

ENTRYPOINT ["node", "dist/index.js"]
EOF

echo "==> docker buildx build (desktop-linux, ${PLATFORM})"
docker buildx build \
  --builder desktop-linux \
  --platform "$PLATFORM" \
  -f "$WORKDIR/Dockerfile.zscaler" \
  --build-context corp-ca="$WORKDIR" \
  -t "$FULL_IMAGE" \
  --provenance=false \
  --load \
  "$REPO_ROOT"

echo "==> Checking AWS SSO session (profile: ${AWS_PROFILE})"
if ! aws sts get-caller-identity --profile "$AWS_PROFILE" >/dev/null 2>&1; then
  aws sso login --profile "$AWS_PROFILE"
fi

echo "==> Logging in to ECR (${ECR_REGISTRY})"
aws ecr get-login-password --profile "$AWS_PROFILE" --region "$AWS_REGION" \
  | docker login --username AWS --password-stdin "$ECR_REGISTRY"

echo "==> Pushing ${FULL_IMAGE}"
docker push "$FULL_IMAGE"

echo "==> Deploying to ${NAMESPACE}/${DEPLOYMENT} (context: ${KUBE_CONTEXT})"
kubectl --context "$KUBE_CONTEXT" -n "$NAMESPACE" set image "deployment/${DEPLOYMENT}" "${CONTAINER}=${FULL_IMAGE}"
kubectl --context "$KUBE_CONTEXT" -n "$NAMESPACE" rollout status "deployment/${DEPLOYMENT}"

echo "==> Done. Deployed image: ${FULL_IMAGE}"
