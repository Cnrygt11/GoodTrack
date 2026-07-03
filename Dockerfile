# Build Stage
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build-env
WORKDIR /app

# Copy csproj and restore dependencies
COPY GoodTrack.API/GoodTrack.API.csproj ./GoodTrack.API/
RUN dotnet restore GoodTrack.API/GoodTrack.API.csproj

# Copy everything else and build release
COPY . ./
RUN dotnet publish GoodTrack.API/GoodTrack.API.csproj -c Release -o out

# Runtime Stage
FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build-env /app/out .

# Expose port and start API
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080
USER app
ENTRYPOINT ["dotnet", "GoodTrack.API.dll"]
