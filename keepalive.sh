#!/bin/bash
cd /home/z/my-project
export NEXT_TELEMETRY_DISABLED=1
while true; do
    echo "$(date) Starting Next.js..."
    NODE_OPTIONS="" node node_modules/next/dist/bin/next dev -p 3000 -H 0.0.0.0
    echo "$(date) Server died. Restarting in 2s..."
    sleep 2
done
