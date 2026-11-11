FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["SchoolAdmissionApi/SchoolAdmissionApi.csproj", "SchoolAdmissionApi/"]
RUN dotnet restore "SchoolAdmissionApi/SchoolAdmissionApi.csproj"
COPY . .
WORKDIR "/src/SchoolAdmissionApi"
RUN dotnet build "SchoolAdmissionApi.csproj" -c Release -o /app/build
RUN dotnet publish "SchoolAdmissionApi.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
EXPOSE 8080
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "SchoolAdmissionApi.dll"]
