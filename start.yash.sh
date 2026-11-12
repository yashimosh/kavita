#!/bin/bash
if [ ! -f /kavita/config/appsettings.json ]; then
    cp /tmp/config/appsettings.json /kavita/config/appsettings.json
fi
cd /kavita
exec /usr/share/dotnet/dotnet Kavita.Server.dll
