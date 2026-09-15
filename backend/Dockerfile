# syntax=docker/dockerfile:1.7

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS restore
WORKDIR /src

COPY ["src/GrandWall.Domain/GrandWall.Domain.csproj", "src/GrandWall.Domain/"]
COPY ["src/GrandWall.Application/GrandWall.Application.csproj", "src/GrandWall.Application/"]
COPY ["src/GrandWall.Infrastructure/GrandWall.Infrastructure.csproj", "src/GrandWall.Infrastructure/"]
COPY ["src/GrandWall.Api/GrandWall.Api.csproj", "src/GrandWall.Api/"]

RUN dotnet restore "src/GrandWall.Api/GrandWall.Api.csproj"

FROM restore AS publish
COPY . .

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

USER $APP_UID

ENTRYPOINT ["dotnet", "GrandWall.Api.dll"]
