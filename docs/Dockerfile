FROM alpine

RUN apk update && apk add bash
RUN apk update && apk add curl
RUN apk update && apk add jq

COPY products /app/products
COPY scripts /app/scripts

# ENV LOG_LEVEL=1

# RUN ["/bin/bash", "-c", ". ./app/scripts/utilities.sh"]
CMD ["/bin/bash", "-c", ". ./app/scripts/publish-portal-content.sh && portal_product_upsert \"./app/products/SmartBear MCP Server/manifest.json\" \"SmartBear MCP Server\""]
CMD ["/bin/bash", "-c", ". ./app/scripts/publish-portal-content.sh && load_and_process_product_manifest_content_metadata \"./app/products/SmartBear MCP Server/manifest.json\" \"SmartBear MCP Server\""]