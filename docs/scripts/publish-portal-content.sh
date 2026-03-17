#!/bin/bash

# Author: @frankkilcommins
# This script is part of a workflow that publishes content to the SwaggerHub Portal instance.

# SwaggerHub Portal API Ref: https://app.swaggerhub.com/apis-docs/smartbear-public/swaggerhub-portal-api/0.7.0-beta
# Tested against SwaggerHub Portal API v0.7.0-beta

# Required environment variables:
# - SWAGGERHUB_API_KEY: SwaggerHub API Key
# - SWAGGERHUB_PORTAL_SUBDOMAIN: SwaggerHub Portal subdomain

# Source the utility script to use its functions
source "$(dirname "${BASH_SOURCE[0]}")/utilities.sh"

PORTAL_SUBDOMAIN="${SWAGGERHUB_PORTAL_SUBDOMAIN}"
SWAGGERHUB_API_KEY="${SWAGGERHUB_API_KEY}"
PORTAL_URL="https://api.portal.swaggerhub.com/v1"

declare -g section_id
declare -g product_id
declare -g document_id

## HELPER FUNCTIONS

function publish_response_check() {
  local response=$1

  if [ -n "$response" ] && [ "$response" != "null" ]; then

    local validationMessages=$(echo $response | jq -r .validationMessages)
    local validationMessagesLength=$(echo $response | jq '.validationMessages | length')

    if [ -n "$validationMessages" ] && [ "$validationMessages" != "null" ] && [ "$validationMessagesLength" -gt 0 ]; then
      log_message $ERROR "Failed! with validationMessages: $validationMessages"
    else
      log_message $INFO "No publish validation messages found."
    fi

    log_message $INFO "Done publishing."
  fi
}

# Function to URL-encode a string
url_encode() {
  local string="$1"
  local encoded=""
  for (( i=0; i<${#string}; i++ )); do
    local c="${string:$i:1}"
    case "$c" in
      [a-zA-Z0-9.~_-]) encoded="$encoded$c" ;;
      ' ') encoded="$encoded%20" ;;
      *) encoded="$encoded$(printf '%%%02X' "'$c")" ;;
    esac
  done
  echo "$encoded"
}

escape_sed() {
    local str="$1"
    str=$(echo "$str" | sed -e 's/[\/&]/\\&/g' -e 's/(/\\(/g' -e 's/)/\\)/g' -e 's/\[/\\[/g' -e 's/\]/\\]/g' -e 's/\\/\\\\/g' -e 's/\./\\./g' -e 's/\*/\\*/g' -e 's/\!/\\!/g')
    echo "$str"
}

# FUNCTIONS TO MANAGE PORTAL CONTENT
function portal_branding_image_post() {
    log_message $DEBUG "Enter portal_product_branding_image_post"
    local portal_id=$1
    local image_path=$2
    local image_name=$3

    # let's parse the image path to get the image name (everything after the last /)
    image_shortname=$(basename "$image_path")

    local encoded_param_value=$(url_encode "$image_shortname")

    log_message $INFO "Uploading branding image for portal $portal_id from /products/$image_name/$image_path"
    log_message $DEBUG "See if image $image_shortname already exists"

    # get existing branding attachments
    portal_branding_attachments_get "$portal_id"

    # Check if the image is already uploaded
    local image_already_uploaded=$(echo "$existing_branding_attachments" | jq -r "first(.[] | select(.name == \"$image_shortname\")) | .id")

    if [ -n "$image_already_uploaded" ]; then
        log_message $INFO "Image already uploaded: $image_already_uploaded"
        branding_image_id=$image_already_uploaded
        log_message $DEBUG "Exit portal_product_branding_image_post"
        return
    fi

    # get the Content-Type of the image from the image path if the file exists
    local full_path="./docs/products/$image_name/$image_path"

    if [ ! -f "$full_path" ]; then
        log_message $WARNING "File does not exist: $full_path"
        return
    fi

    local content_type=$(file --mime-type -b "$full_path")

    local response=$(curl -s --request POST \
        --url "$PORTAL_URL/attachments/branding/$portal_id?name=$encoded_param_value" \
        --header "Authorization: Bearer $SWAGGERHUB_API_KEY" \
        --header "Content-Type: $content_type" \
        --data-binary "@$full_path")

    log_message $INFO "Response: $response"

    branding_image_id=$(echo "$response" | jq -r .id)

    log_message $INFO "Done uploading branding image."
    log_message $DEBUG "Exit portal_product_branding_image_post"
}

function portal_product_doc_image_post() {
    log_message $DEBUG "Enter portal_product_doc_image_post"
    local image_filename=$1
    local product_name=$2

    local encoded_param_value=$(url_encode "$image_filename")
    portal_product_get_id "$product_name"

    # Get already uploaded images
    portal_product_documentation_attachments_get "$product_id"

    # Check if the image is already uploaded
    local image_already_uploaded=$(echo "$existing_attachments" | jq -r ".[] | select(.name == \"$image_filename\") | .id")

    if [ -n "$image_already_uploaded" ]; then
        log_message $INFO "Image already uploaded: $image_already_uploaded"
        log_message $DEBUG "Exit portal_product_doc_image_post"
        return
    fi

    log_message $INFO "Uploading image for product $product_id from /products/$product_name/images/embedded/$image_filename"

    # get the Content-Type of the image from the image path
    local full_path="./docs/products/$product_name/images/embedded/$image_filename"
    local content_type=$(file --mime-type -b "$full_path")

    local response=$(curl -s --request POST \
        --url "$PORTAL_URL/attachments/documentation/$product_id?name=$encoded_param_value" \
        --header "Authorization: Bearer $SWAGGERHUB_API_KEY" \
        --header "Content-Type: $content_type" \
        --data-binary "@$full_path")

    log_message $INFO "Done uploading documentation image."
    log_message $DEBUG "Exit portal_product_doc_image_post"
}

function portal_branding_attachments_get() {
    log_message $DEBUG "Enter portal_branding_attachments_get"
    local portal_id=$1

    log_message $INFO "Fetching branding attachments for portal $portal_id..."
    local response=$(curl -s --request GET \
        --url "$PORTAL_URL/attachments?portalId=$portal_id" \
        --header "Authorization: Bearer $SWAGGERHUB_API_KEY" \
        --header "Content-Type: application/json")

    existing_branding_attachments=$(echo "$response" | jq -r '.')

    log_message $DEBUG "Existing branding attachments: $existing_branding_attachments"
    log_message $INFO "Done fetching branding attachments."
    log_message $DEBUG "Exit portal_branding_attachments_get"
}

function portal_product_documentation_attachments_get() {
    log_message $DEBUG "Enter portal_product_documentation_attachments_get"
    local product_id=$1

    log_message $INFO "Fetching documentation attachments for product $product_id..."
    local response=$(curl -s --request GET \
        --url "$PORTAL_URL/attachments?productId=$product_id" \
        --header "Authorization: Bearer $SWAGGERHUB_API_KEY" \
        --header "Content-Type: application/json")

    existing_attachments=$(echo "$response" | jq -r '.')
    log_message $DEBUG "Existing documentation attachments: $existing_attachments"
    log_message $INFO "Done fetching documentation attachments."
    log_message $DEBUG "Exit portal_product_documentation_attachments_get"
}

function portal_product_load_documentation_images() {
    log_message $DEBUG "Enter portal_product_load_documentation_images"
    local product_name=$1

    log_message $INFO "Loading documentation images for product $product_name ..."

    local images_path="./docs/products/$product_name/images/embedded"
    if [ ! -d "$images_path" ]; then
        log_message $WARNING "No images found in $images_path"
        return
    fi

    local images=$(ls "$images_path")
    for image in $images; do
        portal_product_doc_image_post "$image" "$product_name"
    done

    log_message $INFO "Done loading documentation images."
    log_message $DEBUG "Exit portal_product_load_documentation_images"
}

function load_and_process_product_manifest_content_metadata() {
    log_message $DEBUG "Enter load_and_process_product_manifest_content_metadata"
    local file=$1
    local product_name=$2

    portal_product_get_id "$product_name"

    log_message $INFO "Loading product manifest: $file ..."

    if [ ! -f "$file" ]; then
        log_message $ERROR "File not found: $file"
        exit 1
    fi

    local length=$(jq '[.contentMetadata[] | select(.parent == null or .parent == "")] | length' "$file")

    if [ $length -eq 0 ]; then
        log_message $INFO "No content metadata found in manifest file."
        exit 1
    fi

    local items=$(jq -c '[.contentMetadata[] | select(.parent == null or .parent == "")]' "$file")

    portal_product_load_documentation_images "$product_name"

    IFS=$'\n' # Change the Internal Field Separator to newline
    for item in $(echo "${items}" | jq -c '.[]'); do
        product_toc_id=""
        parent_toc_id=""

        log_message $DEBUG "Item: $item"
        local type=$(echo "$item" | jq -r ".type")
        local order=$(echo "$item" | jq -r ".order")
        local parent=$(echo "$item" | jq -r ".parent")
        local name=$(echo "$item" | jq -r ".name")
        local slug=$(echo "$item" | jq -r ".slug")
        local contentUrl=$(echo "$item" | jq -r ".contentUrl")

        log_message $INFO "************** Processing root-level content item **************"
        log_message $INFO "Type: $type"
        log_message $INFO "Order: $order"
        log_message $INFO "Parent: $parent"
        log_message $INFO "Name: $name"
        log_message $INFO "Slug: $slug"
        log_message $INFO "ContentUrl: $contentUrl"
        log_message $INFO "****************************************************************"

        if [ "${type,,}" == "apiurl" ]; then
            portal_product_toc_api_reference_upsert "$name" "$slug" $order "$contentUrl" "$product_toc_id" "$type"
        else
            portal_product_toc_markdown_upsert "$name" "$slug" $order "$product_toc_id" "$type"
            log_message $INFO "Document ID: $document_id"

            local markdown_file="./docs/products/$product_name/$contentUrl"
            if [ ! -f "$markdown_file" ]; then
                log_message $ERROR "Markdown/html file not found: $markdown_file"
                exit 1
            fi

            local markdownContent="$(cat "$markdown_file")"

            log_message $INFO "Checking for attachments to replace in markdown/html content..."
            log_message $DEBUG "Existing attachments: $existing_attachments"
            IFS=$'\n' # set the internal field separator to newline
            attachments=($(jq -r '.[] | "\(.id)\t\(.name)"' <<< "$existing_attachments"))

            for attachment in "${attachments[@]}"; do
                IFS=$'\t' read -r attachment_id attachment_name <<< "$attachment"
                log_message $DEBUG "Processing attachment: $attachment_id, $attachment_name"
                attachment_url="https://$PORTAL_SUBDOMAIN.portal.swaggerhub.com/services/api/attachments/$attachment_id"

                escaped_attachment_name=$(escape_sed "$attachment_name")
                escaped_attachment_url=$(escape_sed "$attachment_url")

                if [[ "$type" == "html" ]]; then
                    # Replace image src in HTML fragments
                    markdownContent=$(sed -E "s#src=[\"']\.\/images\/embedded\/${escaped_attachment_name}[\"']#src=\"${attachment_url}\"#g" <<< "$markdownContent")
                else
                    # Replace markdown image path
                    markdownContent=$(sed -E "s#\!\[$escaped_attachment_name\]\(\.\/images\/embedded\/$escaped_attachment_name\)#\!\[$escaped_attachment_name\]\($escaped_attachment_url\)#g" <<< "$markdownContent")
                fi
            done

            log_message $INFO "Attachment replacement done."
            log_message $DEBUG "Markdown/HTML Content: $markdownContent"
            portal_product_document_markdown_patch "$markdownContent" "$type"
        fi

        log_message $DEBUG "Setting parent_toc_id to $product_toc_id"
        parent_toc_id=$product_toc_id

        parent=$slug

        local children=$(jq --arg parent "$parent" -c '[.contentMetadata[] | select(.parent == $parent)]' "$file")
        local children_length=$(jq 'length' <<< "$children")
        log_message $DEBUG "Children length: $children_length"

        for ((j=0; j<$children_length; j++))
        do
            log_message $INFO "Processing nested content item $j of $children_length ..."
            local child_type=$(jq -r ".[$j].type" <<< "$children")
            local child_order=$(jq -r ".[$j].order" <<< "$children")
            local child_name=$(jq -r ".[$j].name" <<< "$children")
            local child_slug=$(jq -r ".[$j].slug" <<< "$children")
            local child_contentUrl=$(jq -r ".[$j].contentUrl" <<< "$children")

            if [ "$child_type" == "apiUrl" ]; then
                log_message $DEBUG "Processing API reference for : $child_name, $child_slug, $child_order, $child_contentUrl, $parent_toc_id"
                portal_product_toc_api_reference_upsert "$child_name" "$child_slug" $child_order "$child_contentUrl" "$parent_toc_id"
            else
                log_message $DEBUG "Processing markdown for : $child_name, $child_slug, $child_order, $parent_toc_id", "$child_type"
                portal_product_toc_markdown_upsert "$child_name" "$child_slug" $child_order "$parent_toc_id" "$child_type"
                log_message $INFO "Document ID for CHILD: $document_id"

                local child_markdown_file="./docs/products/$product_name/$child_contentUrl"
                if [ ! -f "$child_markdown_file" ]; then
                    log_message $ERROR "Markdown file not found: $child_markdown_file"
                    exit 1
                fi

                local markdownChildContent="$(cat "$child_markdown_file")"

                log_message $INFO "Checking for attachments to replace in nested markdown/html content..."
                log_message $DEBUG "Existing attachments: $existing_attachments"
                IFS=$'\n' # set the internal field separator to newline

                attachments=($(jq -r '.[] | "\(.id)\t\(.name)"' <<< "$existing_attachments"))

                for attachment in "${attachments[@]}"; do
                    IFS=$'\t' read -r attachment_id attachment_name <<< "$attachment"
                    log_message $DEBUG "Processing attachment: $attachment_id, $attachment_name"
                    attachment_url="https://$PORTAL_SUBDOMAIN.portal.swaggerhub.com/services/api/attachments/$attachment_id"

                    escaped_attachment_name=$(escape_sed "$attachment_name")
                    escaped_attachment_url=$(escape_sed "$attachment_url")

                    if [[ "$child_type" == "html" ]]; then
                        # Replace image src in HTML fragments
                        markdownChildContent=$(sed -E "s#src=[\"']\.\/images\/embedded\/${escaped_attachment_name}[\"']#src=\"${attachment_url}\"#g" <<< "$markdownChildContent")
                    else
                        # Replace markdown image path
                        markdownChildContent=$(sed -E "s#\!\[$escaped_attachment_name\]\(\.\/images\/embedded\/$escaped_attachment_name\)#\!\[$escaped_attachment_name\]\($escaped_attachment_url\)#g" <<< "$markdownChildContent")
                    fi
                done

                log_message $INFO "Attachment replacement in nested content done."
                log_message $INFO "Updating markdown/html content for $child_name"
                log_message $DEBUG "Markdown Content: $markdownChildContent"
                portal_product_document_markdown_patch "$markdownChildContent" "$child_type"
            fi
        done

    done

    log_message $INFO "Done processing contentMetadata from manifest for $product_name."
    portal_product_publish "$product_id" $auto_publish
    log_message $DEBUG "Exit load_and_process_product_manifest_content_metadata"
}

function portal_portal_get_id() {
    log_message $DEBUG "Enter portal_portal_get_id"
    local response=$(curl -s --request GET \
        --url "$PORTAL_URL/portals?subdomain=$PORTAL_SUBDOMAIN" \
        --header "Authorization: Bearer $SWAGGERHUB_API_KEY" \
        --header "Content-Type: application/json")

    portal_id=$(echo "$response" | jq -r '.items[0].id')
    log_message $INFO "Done fetching portal ID: $portal_id"
    log_message $DEBUG "Exit portal_portal_get_id"
}

function portal_product_get_id() {
    log_message $DEBUG "Enter portal_product_get_id"
    local product_name=$1
    local encoded_product_name=$(printf '%s' "$product_name" | od -An -tx1 | tr ' ' % | tr -d '\n')

    log_message $INFO "Searching for product: $product_name in portal $portal_id ..."
    local response=$(curl -s --request GET \
        --url "$PORTAL_URL/portals/$portal_id/products?name=$encoded_product_name" \
        --header "Authorization: Bearer $SWAGGERHUB_API_KEY" \
        --header "Content-Type: application/json")

    product_id=$(echo "$response" | jq -r '.items[0].id')
    log_message $INFO "Done fetching product ID: $product_id"
    log_message $DEBUG "Exit portal_product_get_id"
}

function portal_product_upsert() {
    log_message $DEBUG "Enter portal_product_upsert"
    local file=$1
    local product_name=$2
    product_id=""
    section_id=""
    auto_publish=""

    log_message $INFO "##########################################"
    log_message $INFO "## Processing product: $product_name"
    log_message $INFO "##########################################"
    log_message $INFO "Loading product manifest: $file ..."

    if [ ! -f "$file" ]; then
        log_message $ERROR "File not found: $file"
        exit 1
    fi

    local length=$(jq '.productMetadata | length' "$file")
    if [ $length -eq 0 ]; then
        log_message $ERROR "No product metadata found in manifest file."
        exit 1
    fi

    local product_description=$(jq -r ".productMetadata.description" "$file")
    local product_slug=$(jq -r ".productMetadata.slug" "$file")
    local product_public=$(jq -r ".productMetadata.public" "$file")
    local product_hidden=$(jq -r ".productMetadata.hidden" "$file")
    local product_logo=$(jq -r ".productMetadata.logo" "$file")
    local product_logo_dark=$(jq -r ".productMetadata.logoDark" "$file")
    auto_publish=$(jq -r ".productMetadata.autoPublish" "$file")

    log_message $INFO "Upserting product: $product_name in portal $portal_id ..."
    portal_product_get_id "$product_name"

    if [ -z "$product_id" ] || [ "$product_id" == "null" ]; then
        portal_product_post "$product_name" "$product_description" "$product_slug" $product_public $product_hidden
    else
        portal_product_patch "$product_id" "$product_name" "$product_description" "$product_slug" $product_public $product_hidden
    fi

    log_message $DEBUG "Product logo: $product_logo"
    if [ -n "$product_logo" ]; then
        portal_branding_image_post "$portal_id" "$product_logo" "$product_name"

        log_message $INFO "Patching product with branding image for logoId..."
        local response=$(curl -s --request PATCH \
            --url "$PORTAL_URL/products/$product_id" \
            --header "Authorization: Bearer $SWAGGERHUB_API_KEY" \
            --header "Content-Type: application/json" \
            --data "{
                \"branding\": {
                    \"logoId\": \"$branding_image_id\"
                }
            }")

        log_message $DEBUG "Product patch response: $response"
    fi

    if [ -n "$product_logo_dark" ]; then
        portal_branding_image_post "$portal_id" "$product_logo_dark" "$product_name-dark"

        local response=$(curl -s --request PATCH \
            --url "$PORTAL_URL/products/$product_id" \
            --header "Authorization: Bearer $SWAGGERHUB_API_KEY" \
            --header "Content-Type: application/json" \
            --data "{
                \"branding\": {
                    \"logoDarkModeId\": \"$branding_image_id\"
                }
            }")
    fi

    portal_product_get_default_section_id "$product_id"
    log_message $INFO "Done upserting product."
    log_message $DEBUG "Exit portal_product_upsert"
}

function portal_product_post() {
    log_message $DEBUG "Enter portal_product_post"
    local product_name=$1
    local product_description=$2
    local product_slug=$3
    local product_public=$4
    local product_hidden=$5

    log_message $INFO "Creating product: $product_name in portal $portal_id ..."
    local response=$(curl -s --request POST \
        --url "$PORTAL_URL/portals/$portal_id/products" \
        --header "Authorization: Bearer $SWAGGERHUB_API_KEY" \
        --header "Content-Type: application/json" \
        --data "{
            \"type\": \"new\",
            \"name\": \"$product_name\",
            \"description\": \"$product_description\",
            \"slug\": \"$product_slug\",
            \"public\": $product_public,
            \"hidden\": $product_hidden
        }")

    product_id=$(echo "$response" | jq -r .id)
    log_message $INFO "Done creating product: $product_id"
    log_message $DEBUG "Exit portal_product_post"
}

function portal_product_patch() {
    log_message $DEBUG "Enter portal_product_patch"
    local product_id=$1
    local product_name=$2
    local product_description=$3
    local product_slug=$4
    local product_public=$5
    local product_hidden=$6

    log_message $INFO "Updating product: $product_name in portal $portal_id ..."
    local response=$(curl -s --request PATCH \
        --url "$PORTAL_URL/products/$product_id" \
        --header "Authorization: Bearer $SWAGGERHUB_API_KEY" \
        --header "Content-Type: application/json" \
        --data "{
            \"name\": \"$product_name\",
            \"description\": \"$product_description\",
            \"slug\": \"$product_slug\",
            \"public\": $product_public,
            \"hidden\": $product_hidden
        }")

    log_message $DEBUG "Product patch response: $response"
    log_message $INFO "Done updating product."
    log_message $DEBUG "Exit portal_product_patch"
}

function portal_product_get_default_section_id() {
    log_message $DEBUG "Enter portal_product_get_default_section_id"
    local product_id=$1

    log_message $INFO "Searching for default section in product $product_id ..."
    local response=$(curl -s --request GET \
        --url "$PORTAL_URL/products/$product_id/sections" \
        --header "Authorization: Bearer $SWAGGERHUB_API_KEY" \
        --header "Content-Type: application/json")

    section_id=$(echo "$response" | jq -r '.items[0].id')

    log_message $INFO "Done fetching default section ID: $section_id"
    log_message $DEBUG "Exit portal_product_get_default_section_id"
}

function portal_product_toc_get_id() {
    log_message $DEBUG "Enter portal_product_toc_get_id"
    local product_section_id=$1
    local title=$2

    log_message $INFO "Searching for API reference: $title in product $product_id and section $product_section_id ..."
    local response=$(curl -s --request GET \
        --url "$PORTAL_URL/sections/$product_section_id/table-of-contents" \
        --header "Authorization: Bearer $SWAGGERHUB_API_KEY" \
        --header "Content-Type: application/json")

    if [ $(echo "$response" | jq '.items | length') -gt 0 ]; then
        product_toc_id=$(echo "$response" | jq -r ".items[] | select(.title == \"$title\") | .id")
        product_toc_slug=$(echo "$response" | jq -r ".items[] | select(.title == \"$title\") | .slug")

        if [ -z "$product_toc_id" ] || [ "$product_toc_id" == "null" ]; then
            product_toc_id=$(echo "$response" | jq -r ".items[] | .children[] | select(.title == \"$title\") | .id")
            product_toc_slug=$(echo "$response" | jq -r ".items[] | .children[] | select(.title == \"$title\") | .slug")
        fi

        log_message $DEBUG "Product TOC ID: $product_toc_id and Product TOC Slug: $product_toc_slug"
    else
        product_toc_id=""
        product_toc_slug=""
        log_message $INFO "No product TOC ID found."
    fi

    log_message $INFO "Done fetching product TOC ID."
    log_message $DEBUG "Exit portal_product_toc_get_id"
}

function portal_product_toc_api_reference_upsert() {
    log_message $DEBUG "Enter portal_product_toc_api_reference_upsert"
    local api_title=$1
    local api_slug=$2
    local content_order=$3
    local api_url=$4
    local parent_toc_id=$5

    log_message $INFO "Upserting API reference: $api_title in product $product_id ..."
    portal_product_toc_get_id "$section_id" "$api_title"

    if [ -z "$product_toc_id" ] || [ "$product_toc_id" == "null" ]; then
        portal_product_toc_api_reference_post "$section_id" "$api_title" "$api_slug" "$content_order" "$api_url" "$parent_toc_id"
    else
        portal_product_toc_api_reference_patch "$api_title" "$api_slug" "$content_order" "$api_url" "$product_toc_slug" "$parent_toc_id"
    fi

    log_message $INFO "Done upserting API reference."
    log_message $DEBUG "Exit portal_product_toc_api_reference_upsert"
}

function portal_product_toc_api_reference_post() {
    log_message $DEBUG "Enter portal_product_toc_api_reference_post"
    local product_section_id=$1
    local api_title=$2
    local api_slug=$3
    local content_order=$4
    local api_url=$5

    log_message $INFO "Creating API reference: $api_title in product $product_id and section $product_section_id..."
    log_message $DEBUG "Parent TOC ID: $parent_toc_id"

    local response=$(curl -s --request POST \
        --url "$PORTAL_URL/sections/$product_section_id/table-of-contents" \
        --header "Authorization: Bearer $SWAGGERHUB_API_KEY" \
        --header "Content-Type: application/json" \
        --data "{
            \"type\": \"new\",
            \"title\": \"$api_title\",
            \"slug\": \"$api_slug\",
            \"order\": $content_order,
            \"parentId\": \"$parent_toc_id\",
            \"content\": {
                \"type\": \"apiUrl\",
                \"url\": \"$api_url\"
            }
        }")

   log_message $DEBUG "POST API ToC Response: $response"
   log_message $INFO "Done creating API reference."
   log_message $DEBUG "Exit portal_product_toc_api_reference_post"
}

function portal_product_toc_api_reference_patch() {
    log_message $DEBUG "Enter portal_product_toc_api_reference_patch"
    local api_title=$1
    local api_slug=$2
    local content_order=$3
    local api_url=$4
    local existing_slug=$5

    log_message $INFO "Updating API reference: $api_title in product $product_id ..."

    if [ "$api_slug" == "$existing_slug" ]; then
        log_message $INFO "Slug is the same, not updating slug."
        local response=$(curl -s --request PATCH \
            --url "$PORTAL_URL/table-of-contents/$product_toc_id" \
            --header "Authorization: Bearer $SWAGGERHUB_API_KEY" \
            --header "Content-Type: application/json" \
            --data "{
                \"title\": \"$api_title\",
                \"order\": $content_order,
                \"parentId\": \"$parent_toc_id\",
                \"content\": {
                    \"type\": \"apiUrl\",
                    \"url\": \"$api_url\"
                }
            }")
    else
        local response=$(curl -s --request PATCH \
            --url "$PORTAL_URL/table-of-contents/$product_toc_id" \
            --header "Authorization: Bearer $SWAGGERHUB_API_KEY" \
            --header "Content-Type: application/json" \
            --data "{
                \"title\": \"$api_title\",
                \"slug\": \"$api_slug\",
                \"order\": $content_order,
                \"parentId\": \"$parent_toc_id\",
                \"content\": {
                    \"type\": \"apiUrl\",
                    \"url\": \"$api_url\"
                }
            }")
    fi

    log_message $DEBUG "PATCH API ToC Response: $response"
    log_message $INFO "Done updating API reference."
    log_message $DEBUG "Exit portal_product_toc_api_reference_patch"
}

function portal_product_toc_markdown_upsert() {
    log_message $DEBUG "Enter portal_product_toc_markdown_upsert"
    local markdown_title=$1
    local markdown_slug=$2
    local content_order=$3
    local parent_toc_id=$4
    local type=$5
    local source=$6

    log_message $INFO "Upserting markdown TOC: $markdown_title in product $product_id ..."
    portal_product_toc_get_id "$section_id" "$markdown_title"

    if [ -z "$product_toc_id" ] || [ "$product_toc_id" == "null" ]; then
        log_message $INFO "Posting markdown TOC: $section_id, $markdown_title, $markdown_slug, $content_order, $parent_toc_id"
        portal_product_toc_markdown_post "$section_id" "$markdown_title" "$markdown_slug" "$content_order" "$parent_toc_id" "$type" "$source"
    else
        log_message $INFO "Patching markdown TOC: $section_id, $product_toc_id, $markdown_title, $markdown_slug, $content_order, $parent_toc_id"
        portal_product_toc_markdown_patch "$section_id" "$product_toc_id" "$markdown_title" "$markdown_slug" "$content_order" "$product_toc_slug" "$parent_toc_id" "$type"
    fi

    log_message $DEBUG "Returning document_id: $document_id"
    log_message $INFO "Done upserting markdown TOC."
    log_message $DEBUG "Exit portal_product_toc_markdown_upsert"
}

function portal_product_toc_markdown_post() {
    log_message $DEBUG "Enter portal_product_toc_markdown_post"
    local product_section_id=$1
    local markdown_title=$2
    local markdown_slug=$3
    local content_order=$4
    local parent_toc_id=$5
    local type=$6
    local source=$7

    log_message $INFO "Creating markdown TOC: $markdown_title in product $product_id with parent $parent_toc_id ..."
    local response=$(curl -s --request POST \
        --url "$PORTAL_URL/sections/$product_section_id/table-of-contents" \
        --header "Authorization: Bearer $SWAGGERHUB_API_KEY" \
        --header "Content-Type: application/json" \
        --data "{
            \"type\": \"new\",
            \"title\": \"$markdown_title\",
            \"slug\": \"$markdown_slug\",
            \"order\": $content_order,
            \"parentId\": \"$parent_toc_id\",
            \"content\": {
                \"type\": \"$type\",
                \"source\": \"$source\"
            }
        }")

    log_message $DEBUG "Response: $response"
    product_toc_id=$(echo "$response" | jq -r .id)
    document_id=$(echo "$response" | jq -r .documentId)
    log_message $INFO "Done creating markdown TOC."
    log_message $DEBUG "Exit portal_product_toc_markdown_post"
}

function portal_product_toc_markdown_patch() {
    log_message $DEBUG "Enter portal_product_toc_markdown_patch"
    local product_section_id=$1
    local markdown_toc=$2
    local markdown_title=$3
    local markdown_slug=$4
    local content_order=$5
    local product_toc_slug=$6
    local parent_toc_id=$7
    local type=$8

    log_message $INFO "Updating markdown TOC: $markdown_title in product $product_id with parent $parent_toc_id ..."
    if [ "$markdown_slug" == "$product_toc_slug" ]; then
        log_message $INFO "Slug is the same, not updating slug."
        local response=$(curl -s --request PATCH \
            --url "$PORTAL_URL/table-of-contents/$markdown_toc" \
            --header "Authorization: Bearer $SWAGGERHUB_API_KEY" \
            --header "Content-Type: application/json" \
            --data "{
                \"title\": \"$markdown_title\",
                \"order\": $content_order,
                \"parentId\": \"$parent_toc_id\",
                \"content\": {
                    \"type\": \"$type\"
                }
            }")
    else
        local response=$(curl -s --request PATCH \
            --url "$PORTAL_URL/table-of-contents/$markdown_toc" \
            --header "Authorization: Bearer $SWAGGERHUB_API_KEY" \
            --header "Content-Type: application/json" \
            --data "{
                \"title\": \"$markdown_title\",
                \"slug\": \"$markdown_slug\",
                \"order\": $content_order,
                \"parentId\": \"$parent_toc_id\",
                \"content\": {
                    \"type\": \"$type\"
                }
            }")
    fi

    local toc_response=$(curl -s --request GET \
        --url "$PORTAL_URL/sections/$product_section_id/table-of-contents" \
        --header "Authorization: Bearer $SWAGGERHUB_API_KEY" \
        --header "Content-Type: application/json")

    document_id=$(echo "$toc_response" | jq -r ".items[] | select(.title == \"$markdown_title\") | .content.documentId")

    if [ -z "$document_id" ] || [ "$document_id" == "null" ]; then
        document_id=$(echo "$toc_response" | jq -r ".items[] | .children[] | select(.title == \"$markdown_title\") | .content.documentId")
    fi

    log_message $DEBUG "PATCH Markdown TOC Response: $response"
    log_message $INFO "Done updating markdown TOC."
    log_message $DEBUG "Exit portal_product_toc_markdown_patch"
}

function portal_product_document_markdown_patch() {
    log_message $DEBUG "Enter portal_product_document_markdown_patch"
    local contents=$1
    local type=$2

    log_message $INFO "Updating markdown document in product $product_id for document $document_id..."
    local escaped_contents=$(jq -Rs . <<< "$contents")

    local response=$(curl -s --request PATCH \
        --url "$PORTAL_URL/documents/$document_id" \
        --header "Authorization: Bearer $SWAGGERHUB_API_KEY" \
        --header "Content-Type: application/json" \
        --data "{
            \"content\": $escaped_contents,
            \"type\": \"$type\",
            \"source\": \"$source\"
        }")

    log_message $DEBUG "Document patch response: $response"
    log_message $INFO "Done updating $type document."
    log_message $DEBUG "Exit portal_product_document_markdown_patch"
}

function portal_product_publish() {
    log_message $DEBUG "Enter portal_product_publish"
    local product_id=$1
    local auto_publish=$2

    log_message $INFO "Publishing product $product_id with autoPublish $auto_publish ..."
    if [ "$auto_publish" == "true" ]; then
        preview="false"
    else
        preview="true"
    fi

    local response=$(curl -s --request PUT \
        --url "$PORTAL_URL/products/$product_id/published-content?preview=$preview" \
        --header "Authorization: Bearer $SWAGGERHUB_API_KEY" \
        --header "Content-Type: application/json")

    publish_response_check "$response"

    log_message $INFO "Done publishing product."
    log_message $DEBUG "Exit portal_product_publish"
}


## Initial setup - get portal ID for the subdomain
log_message $INFO "Fetching portal information..."
portalsResponse=$(curl -s --request GET \
    --url "$PORTAL_URL/portals?subdomain=$PORTAL_SUBDOMAIN" \
    --header "Authorization: Bearer $SWAGGERHUB_API_KEY" \
    --header "Content-Type: application/json")

portal_id=$(echo "$portalsResponse" | jq -r '.items[0].id')
log_message $INFO "Portal ID: $portal_id"
