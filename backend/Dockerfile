# syntax=docker/dockerfile:1.7

# Build context is the repository root (see docker-compose.production.yml).

# Web app (installable on iPhone/Android home screen), served by the API from wwwroot.
FROM node:22-bookworm-slim AS web
WORKDIR /web
COPY mobile/package.json mobile/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY mobile/ ./
ARG EXPO_PUBLIC_API_URL=https://api.grandwall.az
ENV EXPO_PUBLIC_API_URL=$EXPO_PUBLIC_API_URL
RUN npx expo export --platform web --output-dir dist

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS restore
WORKDIR /src

COPY ["backend/src/GrandWall.Domain/GrandWall.Domain.csproj", "src/GrandWall.Domain/"]
COPY ["backend/src/GrandWall.Application/GrandWall.Application.csproj", "src/GrandWall.Application/"]
COPY ["backend/src/GrandWall.Infrastructure/GrandWall.Infrastructure.csproj", "src/GrandWall.Infrastructure/"]
COPY ["backend/src/GrandWall.Api/GrandWall.Api.csproj", "src/GrandWall.Api/"]

RUN dotnet restore "src/GrandWall.Api/GrandWall.Api.csproj"

FROM restore AS publish
COPY backend/ .

RUN dotnet publish "src/GrandWall.Api/GrandWall.Api.csproj" \
    --configuration Release \
    --output /app/publish \
    --no-restore \
    /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app

RUN apt-get update \
    && apt-get install --yes --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

ENV ASPNETCORE_HTTP_PORTS=8080 \
    DOTNET_EnableDiagnostics=0

EXPOSE 8080

COPY --from=publish --chown=$APP_UID:$APP_UID /app/publish .
COPY --from=web --chown=$APP_UID:$APP_UID /web/dist ./wwwroot

USER $APP_UID

ENTRYPOINT ["dotnet", "GrandWall.Api.dll"]
