#!/usr/bin/env bash

IBMCLOUD_JSON=$(ibmcloud target --output json | tr -d "\n")

REGION_NAME=$(echo $IBMCLOUD_JSON | sed -E "s/.*\"region\": {[^}]*\"name\": \"([a-z-]*)\"[^}]*}.*/\1/g")
RESOURCE_GROUP_NAME=$(echo $IBMCLOUD_JSON | sed -E "s/.*\"resource_group\": {[^}]*\"name\": \"([a-z-]*)\"[^}]*}.*/\1/g")

if [[ -z "${REGION_NAME}" ]]; then
    echo "Unable to find region value. Make sure you have run 'ibmcloud target -r {region}'"/
    exit 1
fi

if [[ -z "${RESOURCE_GROUP_NAME}" ]]; then
    RESOURCE_GROUP_NAME="<add resource group here>"
fi

ZONE_PREFIX="$(echo ${REGION_NAME} | \
    sed 's/us-south/dal/g' | \
    sed 's/us-east/wdc/g' | \
    sed 's/au-syd/syd/g' | \
    sed 's/jp-tok/tok/g' | \
    sed 's/eu-de/fra/g' | \
    sed 's/eu-gb/lon/g')"
ZONES=$(ibmcloud ks zones --region-only | grep "${ZONE_PREFIX}")

echo ${ZONES} | perl -pe "s|(.*?) .*|\1|g" | while read zone; do
    ibmcloud ks vlans --zone ${zone} | grep rates | \
        sed -E "s/[0-9]+ +rates[0-9a-z]* +([0-9]+) +([a-z]+) +([a-z0-9.]+) +.*/\2;\1;\3/g" | \
        sed -E "s/(.*);(.*);(.*)/\1_vlan_number=\"\2\";\1_vlan_router_hostname=\"\3\"/g" | \
        tr ";" "\n"
    echo "vlan_datacenter=\"$zone\""
    echo "vlan_region=\"${REGION_NAME}\""
    echo "resource_group_name=\"${RESOURCE_GROUP_NAME}\""
done
