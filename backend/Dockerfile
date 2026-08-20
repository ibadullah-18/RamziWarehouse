# syntax=docker/dockerfile:1.7

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS restore
WORKDIR /src

COPY ["src/RamziWarehouse.Domain/RamziWarehouse.Domain.csproj", "src/RamziWarehouse.Domain/"]
COPY ["src/RamziWarehouse.Application/RamziWarehouse.Application.csproj", "src/RamziWarehouse.Application/"]
COPY ["src/RamziWarehouse.Infrastructure/RamziWarehouse.Infrastructure.csproj", "src/RamziWarehouse.Infrastructure/"]
COPY ["src/RamziWarehouse.Api/RamziWarehouse.Api.csproj", "src/RamziWarehouse.Api/"]

RUN dotnet restore "src/RamziWarehouse.Api/RamziWarehouse.Api.csproj"

FROM restore AS publish
COPY . .

RUN dotnet publish "src/RamziWarehouse.Api/RamziWarehouse.Api.csproj" \
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

ENTRYPOINT ["dotnet", "RamziWarehouse.Api.dll"]
