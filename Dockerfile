# --- Frontend Build Stage ---
# Builds the React SPA into client-app-redesign/dist (RENDER flag switches Vite outDir to ./dist).
FROM node:20-alpine AS frontend-build
WORKDIR /app/client-app-redesign
ENV RENDER=1
COPY client-app-redesign/package*.json ./
RUN npm ci
COPY client-app-redesign/ ./
RUN npm run build

# --- Backend Build Stage ---
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build-env
WORKDIR /app

# Copy csproj and restore dependencies (layer cached until the project file changes)
COPY GoodTrack.API/GoodTrack.API.csproj ./GoodTrack.API/
RUN dotnet restore GoodTrack.API/GoodTrack.API.csproj

# Copy the rest and publish a Release build
COPY . ./
RUN dotnet publish GoodTrack.API/GoodTrack.API.csproj -c Release -o out

# --- Runtime Stage ---
FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build-env /app/out .

# Serve the freshly built SPA (UseStaticFiles + MapFallbackToFile("index.html"))
COPY --from=frontend-build /app/client-app-redesign/dist ./wwwroot

# Expose port and start API
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080
USER app
ENTRYPOINT ["dotnet", "GoodTrack.API.dll"]
